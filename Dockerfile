# Build Stage
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

COPY backend/pom.xml .
COPY backend/mvnw .
COPY backend/.mvn .mvn
COPY backend/src ./src

RUN apk add --no-cache maven
RUN mvn clean package -DskipTests

# Runtime Stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar
COPY data ./data

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]