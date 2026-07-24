# --- Etapa 1: build ---
# Usa uma imagem com Maven + JDK 21 só para compilar; ela não vai pro
# container final (economiza um bom espaço em disco/imagem).
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /build

# Copia primeiro só o pom.xml para aproveitar o cache de camadas do Docker:
# se as dependências não mudarem, o "mvn dependency:go-offline" não roda de novo.
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

# --- Etapa 2: runtime ---
# Imagem final enxuta: só o JRE (não precisa do JDK/Maven pra rodar o jar já compilado)
FROM eclipse-temurin:21-jre-jammy

# wget é usado só pelo HEALTHCHECK abaixo
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && rm -rf /var/lib/apt/lists/*

# Usuário não-root por segurança
RUN groupadd -r spring && useradd -r -g spring spring
WORKDIR /app

COPY --from=build /build/target/*.jar app.jar

# Onde o volume do banco H2 (arquivo) é montado - ver DB_URL no docker-compose.yml
RUN mkdir -p /data && chown -R spring:spring /app /data
USER spring

EXPOSE 8080

# Healthcheck: usa o endpoint do Spring Boot Actuator (retorna 200 quando a API está saudável)
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD wget -q -O- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
