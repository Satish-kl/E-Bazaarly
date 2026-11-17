
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        COMPOSE_PROJECT_NAME = 'ebazaarly'
    }

    stages {

        // 1. Checkout source code
        stage('1. Git Checkout') {
            steps {
                checkout scm
            }
        }

        // 2. Prepare environment variables
        stage('2. Prepare Environment') {
            steps {
                bat '''
                    if not exist .env (
                        if exist .env.example (
                            copy .env.example .env
                        ) else (
                            echo ERROR: .env.example file not found
                            exit /b 1
                        )
                    )
                '''

                bat '''
                    powershell -NoProfile -Command "$envFile = Get-Content .env -Raw; if ($envFile -notmatch '(?m)^JWT_SECRET=.+$') { Write-Error 'JWT_SECRET is missing or empty in .env'; exit 1 }"
                '''
            }
        }

        // 3. Validate Docker and Compose
        stage('3. Docker Validation') {
            steps {
                bat 'docker --version'
                bat 'docker compose version'
                bat 'docker compose config -q'
            }
        }

        // 4. Test backend microservices
        stage('4. Backend Tests') {
            steps {
                bat '''
                    cd services\\user-service
                    if exist package-lock.json call npm ci
                    call npm test --if-present

                    cd ..\\product-service
                    if exist package-lock.json call npm ci
                    call npm test --if-present

                    cd ..\\order-service
                    if exist package-lock.json call npm ci
                    call npm test --if-present
                '''
            }
        }

        // 5. Validate frontend
        stage('5. Frontend Validation') {
            steps {
                bat '''
                    cd frontend

                    if exist package-lock.json call npm ci

                    if exist package.json call npm run build --if-present
                '''
            }
        }

        // 6. Build all Docker images
        stage('6. Build Docker Images') {
            steps {
                bat 'docker compose build'
            }
        }

        // 7. Verify built images
        stage('7. Verify Docker Images') {
            steps {
                bat 'docker images'
            }
        }

        // 8. Start application
        stage('8. Deploy Locally') {
            steps {
                bat 'docker compose up -d --remove-orphans'
            }
        }

        // 9. Verify containers
        stage('9. Container Verification') {
            steps {
                bat 'docker compose ps'
            }
        }

        // 10. Verify frontend
        stage('10. Frontend Health Check') {
            steps {
                bat '''
                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $success=$false; for ($i=1; $i -le 12; $i++) { try { $r=Invoke-WebRequest 'http://localhost/' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { $success=$true; break } } catch { Start-Sleep -Seconds 5 } }; if (-not $success) { Write-Error 'Frontend health check failed'; exit 1 }; Write-Host 'Frontend HTTP 200 - Application is running'"
                '''
            }
        }
    }

    post {

        success {
            echo '========================================'
            echo 'E-BAZAARLY DEPLOYMENT SUCCESSFUL'
            echo 'Frontend: http://localhost/'
            echo '========================================'
        }

        failure {
            echo '========================================'
            echo 'PIPELINE FAILED'
            echo 'Checking Docker containers...'
            echo '========================================'

            bat 'docker ps -a'
        }

        always {
            echo 'Jenkins pipeline execution completed.'
        }
    }
}
