
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 60, unit: 'MINUTES')
    }

    environment {
        AWS_REGION = 'us-east-1'
        REGISTRY = '383000882295.dkr.ecr.us-east-1.amazonaws.com'
        TAG = "${BUILD_NUMBER}"
        COMPOSE_PROJECT_NAME = 'ebazaarly'
    }

    stages {

        // 1. Git Checkout
        stage('1. Git Checkout') {
            steps {
                checkout scm
            }
        }

        // 2. Validate Required Tools
        stage('2. Environment Validation') {
            steps {
                bat 'aws --version'
                bat 'docker --version'
                bat 'docker compose version'
                bat 'node --version'
                bat 'npm --version'
                bat 'trivy --version'
            }
        }

        // 3. Prepare Secure Environment
        stage('3. Prepare Environment') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'bazaarly-jwt-secret',
                        variable: 'JWT_SECRET'
                    )
                ]) {
                    bat '''
                        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; if ([string]::IsNullOrWhiteSpace($env:JWT_SECRET)) { throw 'JWT_SECRET is empty' }; $utf8 = New-Object System.Text.UTF8Encoding($false); [System.IO.File]::WriteAllText((Join-Path $PWD '.env'), ('JWT_SECRET=' + $env:JWT_SECRET), $utf8)"
                        if errorlevel 1 exit /b 1
                    '''
                }

                bat 'docker compose config -q'
            }
        }

        // 4. Backend Tests
        stage('4. Backend Tests') {
            steps {
                dir('services/user-service') {
                    bat 'npm ci'
                    bat 'npm test --if-present'
                }

                dir('services/product-service') {
                    bat 'npm ci'
                    bat 'npm test --if-present'
                }

                dir('services/order-service') {
                    bat 'npm ci'
                    bat 'npm test --if-present'
                }
            }
        }

        // 5. Frontend Validation
        stage('5. Frontend Validation') {
            steps {
                dir('frontend') {
                    bat 'npm ci'
                    bat 'npm run build'
                }
            }
        }

        // 6. Build Docker Images
        stage('6. Build Docker Images') {
            steps {
                bat '''
                    docker compose --parallel 1 build --pull user-service product-service order-service frontend
                '''
            }
        }

        // 7. Verify Docker Images
        stage('7. Verify Docker Images') {
            steps {
                bat '''
                    docker image inspect "%REGISTRY%/user-service:%TAG%" >NUL
                    if errorlevel 1 exit /b 1

                    docker image inspect "%REGISTRY%/product-service:%TAG%" >NUL
                    if errorlevel 1 exit /b 1

                    docker image inspect "%REGISTRY%/order-service:%TAG%" >NUL
                    if errorlevel 1 exit /b 1

                    docker image inspect "%REGISTRY%/frontend-service:%TAG%" >NUL
                    if errorlevel 1 exit /b 1

                    docker images
                '''
            }
        }

        // 8. Trivy Security Scanning
        stage('8. Trivy Security Scan') {
            steps {
                bat '''
                    trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed "%REGISTRY%/user-service:%TAG%"
                    if errorlevel 1 exit /b 1

                    trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed "%REGISTRY%/product-service:%TAG%"
                    if errorlevel 1 exit /b 1

                    trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed "%REGISTRY%/order-service:%TAG%"
                    if errorlevel 1 exit /b 1

                    trivy image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed "%REGISTRY%/frontend-service:%TAG%"
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        // 9. AWS ECR Authentication
        stage('9. AWS ECR Login') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-ecr-credentials',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    bat '''
                        aws sts get-caller-identity
                        if errorlevel 1 exit /b 1

                        powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $password = aws ecr get-login-password --region $env:AWS_REGION; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; $password | docker login --username AWS --password-stdin $env:REGISTRY; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"
                        if errorlevel 1 exit /b 1
                    '''
                }
            }
        }

        // 10. Push Images to AWS ECR
        stage('10. Push Images to ECR') {
            steps {
                bat '''
                    docker compose push user-service product-service order-service frontend
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        // 11. Local Docker Compose Deployment
        stage('11. Deploy Application') {
            steps {
                bat '''
                    docker compose up -d --remove-orphans
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        // 12. Container Verification
        stage('12. Container Verification') {
            steps {
                bat 'docker compose ps'
                bat 'docker ps -a'
            }
        }

        // 13. Frontend Health Check
        stage('13. Frontend Health Check') {
            steps {
                bat '''
                    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $success=$false; for ($i=1; $i -le 12; $i++) { try { $r=Invoke-WebRequest 'http://localhost/' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { $success=$true; break } } catch { Start-Sleep -Seconds 5 } }; if (-not $success) { docker compose logs --tail=100; throw 'Frontend health check failed' }; Write-Host 'Frontend HTTP 200 - Application is running'"
                '''
            }
        }
    }

    post {

        success {
            echo '=========================================='
            echo 'E-BAZAARLY CI/CD PIPELINE SUCCESSFUL'
            echo '=========================================='
            echo 'All four Docker images pushed to AWS ECR.'
            echo 'Application deployed successfully.'
            echo 'Frontend: http://localhost/'
            echo '=========================================='
        }

        failure {
            echo '=========================================='
            echo 'E-BAZAARLY PIPELINE FAILED'
            echo 'Checking Docker containers and logs...'
            echo '=========================================='

            bat 'docker ps -a'
            bat 'docker compose logs --tail=100'
        }

        always {
            bat 'if exist .env del /f /q .env'
            echo 'Jenkins pipeline execution completed.'
        }
    }
}
