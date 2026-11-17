
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {

        stage('1. Git Checkout') {
            steps {
                checkout scm
            }
        }

        stage('2. Docker Compose Validation') {
            steps {
                bat 'docker --version'
                bat 'docker compose version'
                bat 'docker compose config -q'
            }
        }

        stage('3. Application Tests') {
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

        stage('4. Frontend Validation') {
            steps {
                bat '''
                    cd frontend
                    if exist package-lock.json call npm ci
                    if exist package.json call npm run build --if-present
                '''
            }
        }

        stage('5. Build Docker Images') {
            steps {
                bat 'docker compose build'
            }
        }

        stage('6. Start Application') {
            steps {
                bat 'docker compose up -d'
            }
        }

        stage('7. Verify Containers') {
            steps {
                bat 'docker compose ps'
            }
        }

        stage('8. Verify Frontend') {
            steps {
                bat '''
                    powershell -NoProfile -Command "$r = Invoke-WebRequest http://localhost/ -UseBasicParsing; if ($r.StatusCode -ne 200) { exit 1 }; Write-Host 'Frontend is working'"
                '''
            }
        }
    }

    post {
        success {
            echo 'Bazzarly application running successfully!'
            echo 'Frontend URL: http://localhost/'
        }

        failure {
            echo 'Pipeline failed. Check Jenkins Console Output.'
            bat 'docker compose logs --tail=100'
        }

        always {
            echo 'Jenkins pipeline execution completed.'
        }
    }
}
