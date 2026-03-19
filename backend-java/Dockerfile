FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /workspace

# Copy reactor + module poms first (cache-friendly)
COPY pom.xml .
COPY fogui-java-core/pom.xml fogui-java-core/pom.xml
COPY fogui-spring-starter/pom.xml fogui-spring-starter/pom.xml
COPY backend-java/pom.xml backend-java/pom.xml

# Download dependencies for backend and transitive modules
RUN mvn -q -DskipTests -pl backend-java -am dependency:go-offline

# Copy source trees and build backend with required modules
COPY fogui-java-core/src fogui-java-core/src
COPY fogui-spring-starter/src fogui-spring-starter/src
COPY backend-java/src backend-java/src
RUN mvn -q -DskipTests -pl backend-java -am package

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the built JAR
COPY --from=builder /workspace/backend-java/target/*.jar app.jar

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD wget -q --spider http://localhost:5001/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
