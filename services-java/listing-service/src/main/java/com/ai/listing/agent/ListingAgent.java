package com.ai.listing.agent;

import com.ai.listing.pipeline.ListingPipelineState;

/**
 * Interface for all listing pipeline agents.
 * Each agent receives the current pipeline state, executes its task,
 * updates the state with its outputs, and returns the updated state.
 */
public interface ListingAgent {

    /**
     * Execute this agent's task.
     *
     * @param state The current shared pipeline state
     * @return The updated pipeline state with this agent's outputs populated
     */
    ListingPipelineState execute(ListingPipelineState state);

    /**
     * Human-readable name for logging and UI display.
     */
    String getName();
}
