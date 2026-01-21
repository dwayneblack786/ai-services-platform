package com.ai.va.util;

import java.lang.annotation.*;

/**
 * Custom annotation to inject local server port
 * Replacement for Spring Boot's LocalServerPort
 */
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface LocalServerPort {
}
