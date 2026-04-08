package com.ai.listing.unit.pipeline;

import com.ai.listing.agent.*;
import com.ai.listing.datastore.DataStore;
import com.ai.listing.datastore.DataStoreFactory;
import com.ai.listing.model.DataStoreConfig;
import com.ai.listing.pipeline.HumanReviewGate;
import com.ai.listing.pipeline.ListingPipelineOrchestrator;
import com.ai.listing.pipeline.ListingPipelineState;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests — ListingPipelineOrchestrator
 *
 * Agents are mocked so tests focus on pipeline sequencing and state wiring.
 * Async execution is awaited with a short sleep to let CompletableFuture complete.
 */
@ExtendWith(MockitoExtension.class)
class ListingPipelineOrchestratorTest {

    @Mock private IngestAgent ingestAgent;
    @Mock private VisionAgent visionAgent;
    @Mock private AutoFillAgent autoFillAgent;
    @Mock private CopywriterAgent copywriterAgent;
    @Mock private ComplianceAgent complianceAgent;
    @Mock private HumanReviewGate reviewGate;
    @Mock private DataStoreFactory dataStoreFactory;
    @Mock private DataStore dataStore;

    @InjectMocks
    private ListingPipelineOrchestrator orchestrator;

    private void agentPassThrough(ListingAgent agent) {
        when(agent.execute(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private void awaitAsync() throws InterruptedException {
        TimeUnit.MILLISECONDS.sleep(200);
    }

    // ── startPipeline ─────────────────────────────────────────────────────────

    @Test
    void startPipeline_returnsRunIdAndStatusImmediately() {
        agentPassThrough(ingestAgent);
        agentPassThrough(visionAgent);
        agentPassThrough(autoFillAgent);

        var result = orchestrator.startPipeline("lst-1", "tenant-1",
                List.of(Map.of("photoId", "p1")), Map.of("address", "1 Main"), null);

        assertThat(result.runId()).isNotBlank();
        assertThat(result.status()).isEqualTo("ingest");
    }

    @Test
    void startPipeline_runsPreReviewAgentsInOrder() throws InterruptedException {
        agentPassThrough(ingestAgent);
        agentPassThrough(visionAgent);
        agentPassThrough(autoFillAgent);

        orchestrator.startPipeline("lst-1", "t-1", List.of(), null, null);
        awaitAsync();

        var order = inOrder(ingestAgent, visionAgent, autoFillAgent, reviewGate);
        order.verify(ingestAgent).execute(any());
        order.verify(visionAgent).execute(any());
        order.verify(autoFillAgent).execute(any());
        order.verify(reviewGate).pauseAtReview1(any());
    }

    @Test
    void startPipeline_pausesAtReview1AfterAutoFill() throws InterruptedException {
        agentPassThrough(ingestAgent);
        agentPassThrough(visionAgent);
        agentPassThrough(autoFillAgent);

        orchestrator.startPipeline("lst-1", "t-1", List.of(), null, null);
        awaitAsync();

        verify(reviewGate).pauseAtReview1(any());
        verify(copywriterAgent, never()).execute(any());
    }

    @Test
    void startPipeline_persistsFailedStateWhenAgentThrows() throws InterruptedException {
        when(ingestAgent.execute(any())).thenThrow(new RuntimeException("disk full"));

        orchestrator.startPipeline("lst-1", "t-1", List.of(), null, null);
        awaitAsync();

        verify(reviewGate).pauseAtReview1(argThat(s -> s.getErrors().stream()
                .anyMatch(e -> e.contains("disk full"))));
    }

    @Test
    void startPipeline_initialFieldsAreMergedIntoState() throws InterruptedException {
        agentPassThrough(ingestAgent);
        agentPassThrough(visionAgent);
        agentPassThrough(autoFillAgent);

        orchestrator.startPipeline("lst-1", "t-1", List.of(),
                Map.of("address", "99 Elm St", "price", 750000), null);
        awaitAsync();

        verify(ingestAgent).execute(argThat(s ->
                s.getListingFields().get("address").equals("99 Elm St")));
    }

    // ── resumeAfterReview1 ────────────────────────────────────────────────────

    @Test
    void resumeAfterReview1_runsCopywriterThenComplianceThenPausesAtReview2()
            throws InterruptedException {
        var state = new ListingPipelineState("lst-1", "t-1", "run-1", List.of(), null);
        when(reviewGate.resumeAfterReview1(eq("run-1"), any())).thenReturn(state);
        agentPassThrough(copywriterAgent);
        agentPassThrough(complianceAgent);

        orchestrator.resumeAfterReview1("run-1", Map.of("approved", true));
        awaitAsync();

        var order = inOrder(copywriterAgent, complianceAgent, reviewGate);
        order.verify(copywriterAgent).execute(any());
        order.verify(complianceAgent).execute(any());
        order.verify(reviewGate).pauseAtReview2(any());
    }

    @Test
    void resumeAfterReview1_persistsFailedStateWhenCopywriterThrows()
            throws InterruptedException {
        var state = new ListingPipelineState("lst-1", "t-1", "run-1", List.of(), null);
        when(reviewGate.resumeAfterReview1(eq("run-1"), any())).thenReturn(state);
        when(copywriterAgent.execute(any())).thenThrow(new RuntimeException("Claude timeout"));

        orchestrator.resumeAfterReview1("run-1", Map.of("approved", true));
        awaitAsync();

        verify(reviewGate).pauseAtReview2(argThat(s -> s.getErrors().stream()
                .anyMatch(e -> e.contains("Claude timeout"))));
    }

    // ── resumeAfterReview2 ────────────────────────────────────────────────────

    @Test
    void resumeAfterReview2_persistsAcceptedResultsToDataStore()
            throws InterruptedException {
        var config = new DataStoreConfig();
        var state = new ListingPipelineState("lst-1", "t-1", "run-1", List.of(), config);
        state.setListingFields(Map.of("address", "5 Final Ave"));
        state.setGeneratedCopy(Map.of("mlsDescription", "Great home"));

        when(reviewGate.resumeAfterReview2(eq("run-1"), any())).thenReturn(state);
        when(dataStoreFactory.getDataStore(any())).thenReturn(dataStore);

        orchestrator.resumeAfterReview2("run-1", Map.of("approved", true));
        awaitAsync();

        verify(dataStore).saveListing(eq("t-1"), eq("lst-1"), argThat(data ->
                data.containsKey("listingFields") && data.containsKey("generatedCopy")));
    }

    // ── agent names ───────────────────────────────────────────────────────────

    @Test
    void agentNamesAreLoggedDuringExecution() throws InterruptedException {
        when(ingestAgent.getName()).thenReturn("Ingest");
        when(visionAgent.getName()).thenReturn("Vision");
        when(autoFillAgent.getName()).thenReturn("AutoFill");
        agentPassThrough(ingestAgent);
        agentPassThrough(visionAgent);
        agentPassThrough(autoFillAgent);

        orchestrator.startPipeline("lst-1", "t-1", List.of(), null, null);
        awaitAsync();

        verify(ingestAgent, atLeastOnce()).getName();
        verify(visionAgent, atLeastOnce()).getName();
    }
}
