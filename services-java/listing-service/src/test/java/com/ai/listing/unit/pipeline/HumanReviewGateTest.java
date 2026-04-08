package com.ai.listing.unit.pipeline;

import com.ai.listing.model.PipelineRun;
import com.ai.listing.pipeline.HumanReviewGate;
import com.ai.listing.pipeline.ListingPipelineState;
import com.ai.listing.repository.PipelineRunRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests — HumanReviewGate
 */
@ExtendWith(MockitoExtension.class)
class HumanReviewGateTest {

    @Mock
    private PipelineRunRepository pipelineRunRepository;

    @InjectMocks
    private HumanReviewGate gate;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(gate, "reviewTimeoutHours", 72);
    }

    private ListingPipelineState buildState() {
        var state = new ListingPipelineState("lst-1", "tenant-1", "run-001", List.of(), null);
        state.setListingFields(new HashMap<>(Map.of("bedrooms", 3, "address", "10 Main St")));
        state.setGeneratedCopy(new HashMap<>(Map.of("mlsDescription", "Original copy")));
        return state;
    }

    // ── pauseAtReview1 ────────────────────────────────────────────────────────

    @Test
    void pauseAtReview1_setsStatusAndPersists() {
        when(pipelineRunRepository.findByRunId("run-001")).thenReturn(Optional.empty());
        when(pipelineRunRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var state = buildState();
        gate.pauseAtReview1(state);

        assertThat(state.getStatus()).isEqualTo("review_1");
        assertThat(state.getPausedAt()).isEqualTo("review_1");
        verify(pipelineRunRepository).save(any(PipelineRun.class));
    }

    @Test
    void pauseAtReview1_updatesExistingRunRecord() {
        var existing = new PipelineRun();
        existing.setRunId("run-001");
        when(pipelineRunRepository.findByRunId("run-001")).thenReturn(Optional.of(existing));
        when(pipelineRunRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        gate.pauseAtReview1(buildState());

        var captor = ArgumentCaptor.forClass(PipelineRun.class);
        verify(pipelineRunRepository).save(captor.capture());
        assertThat(captor.getValue().getRunId()).isEqualTo("run-001");
        assertThat(captor.getValue().getStatus()).isEqualTo("review_1");
    }

    // ── pauseAtReview2 ────────────────────────────────────────────────────────

    @Test
    void pauseAtReview2_setsStatusAndPersists() {
        when(pipelineRunRepository.findByRunId(any())).thenReturn(Optional.empty());
        when(pipelineRunRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var state = buildState();
        gate.pauseAtReview2(state);

        assertThat(state.getStatus()).isEqualTo("review_2");
        assertThat(state.getPausedAt()).isEqualTo("review_2");
    }

    // ── resumeAfterReview1 ────────────────────────────────────────────────────

    @Test
    void resumeAfterReview1_appliesEditsToListingFields() {
        var run = savedRun("run-001", "review_1", buildState());
        when(pipelineRunRepository.findByRunId("run-001")).thenReturn(Optional.of(run));
        when(pipelineRunRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var review = Map.of("approved", (Object) true, "edits", Map.of("bedrooms", 4, "price", 500000));
        var result = gate.resumeAfterReview1("run-001", review);

        assertThat(result.getListingFields()).containsEntry("bedrooms", 4);
        assertThat(result.getListingFields()).containsEntry("price", 500000);
        assertThat(result.getListingFields()).containsEntry("address", "10 Main St"); // unchanged
    }

    @Test
    void resumeAfterReview1_clearsePausedAtAndSetsStatusCopywriter() {
        var run = savedRun("run-001", "review_1", buildState());
        when(pipelineRunRepository.findByRunId("run-001")).thenReturn(Optional.of(run));
        when(pipelineRunRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = gate.resumeAfterReview1("run-001", Map.of("approved", true));

        assertThat(result.getStatus()).isEqualTo("copywriter");
        assertThat(result.getPausedAt()).isNull();
        assertThat(result.getHumanReview1()).containsEntry("approved", true);
    }

    @Test
    void resumeAfterReview1_throwsWhenRunNotFound() {
        when(pipelineRunRepository.findByRunId("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gate.resumeAfterReview1("missing", Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("missing");
    }

    // ── resumeAfterReview2 ────────────────────────────────────────────────────

    @Test
    void resumeAfterReview2_appliesEditsToGeneratedCopy() {
        var state = buildState();
        var run = savedRun("run-001", "review_2", state);
        when(pipelineRunRepository.findByRunId("run-001")).thenReturn(Optional.of(run));
        when(pipelineRunRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var review = Map.of("approved", (Object) true,
                "edits", Map.of("mlsDescription", "Updated approved copy"));
        var result = gate.resumeAfterReview2("run-001", review);

        assertThat(result.getGeneratedCopy()).containsEntry("mlsDescription", "Updated approved copy");
        assertThat(result.getStatus()).isEqualTo("accepted");
        assertThat(result.getPausedAt()).isNull();
    }

    @Test
    void resumeAfterReview2_handlesNullGeneratedCopy() {
        var state = buildState();
        state.setGeneratedCopy(null);
        var run = savedRun("run-001", "review_2", state);
        when(pipelineRunRepository.findByRunId("run-001")).thenReturn(Optional.of(run));
        when(pipelineRunRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var review = Map.of("approved", (Object) true,
                "edits", Map.of("mlsDescription", "New copy"));
        var result = gate.resumeAfterReview2("run-001", review);

        assertThat(result.getGeneratedCopy()).containsEntry("mlsDescription", "New copy");
    }

    // ── helper ────────────────────────────────────────────────────────────────

    private PipelineRun savedRun(String runId, String status, ListingPipelineState state) {
        var run = new PipelineRun();
        run.setRunId(runId);
        run.setTenantId(state.getTenantId());
        run.setListingId(state.getListingId());
        run.setStatus(status);
        run.setPausedAt(status);
        run.setListingFields(state.getListingFields() != null ? new HashMap<>(state.getListingFields()) : new HashMap<>());
        run.setGeneratedCopy(state.getGeneratedCopy() != null ? new HashMap<>(state.getGeneratedCopy()) : null);
        run.setErrors(List.of());
        return run;
    }
}
