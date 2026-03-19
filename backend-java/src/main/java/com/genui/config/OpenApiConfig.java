package com.genui.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI fogUiOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FogUI Backend API")
                        .description("Backend API for authentication, API keys, and FogUI transform endpoints")
                        .version("1.0.0")
                        .license(new License().name("MIT")));
    }
}
