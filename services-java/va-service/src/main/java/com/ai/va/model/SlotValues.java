package com.ai.va.model;

import java.util.HashMap;
import java.util.Map;

/**
 * Slot Values Model
 * Tracks extracted entities from conversation (dates, times, emails, etc.)
 */
public class SlotValues {
    
    private Map<String, Object> slots;

    public SlotValues() {
        this.slots = new HashMap<>();
    }

    public void setSlot(String name, Object value) {
        slots.put(name, value);
    }

    public Object getSlot(String name) {
        return slots.get(name);
    }

    public String getSlotAsString(String name) {
        Object value = slots.get(name);
        return value != null ? value.toString() : null;
    }

    public boolean hasSlot(String name) {
        return slots.containsKey(name);
    }

    public void clearSlot(String name) {
        slots.remove(name);
    }

    public void clearAll() {
        slots.clear();
    }

    public Map<String, Object> getAllSlots() {
        return new HashMap<>(slots);
    }

    public int size() {
        return slots.size();
    }

    @Override
    public String toString() {
        return "SlotValues{" +
                "slots=" + slots +
                '}';
    }
}
