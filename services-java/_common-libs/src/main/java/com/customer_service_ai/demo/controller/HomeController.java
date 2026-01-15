package com.customer_service_ai.demo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.customer_service_ai.demo.model.ApiResponse;

@RestController
@RequestMapping("/api")
public class HomeController {

    @GetMapping({"", "/"})
    public ApiResponse getHelloMessage() {
        return ApiResponse.success("hello world - HomeController - dwayne");
    }
}
