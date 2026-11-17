pipeline{
    agent any
    stages{
        stage("validate"){
            steps {
               checkout scm 

            }

        }
        stage("Docker compose validate"){
            steps {
               bat 'docker --version'
               bat 'docker compose version'
               bat 'docker compose config -q' 

            }

        }
        stage("application test"){
            steps{
                bat ''' 
                cd/services/user-service
                if exist  package-lock.json call npm ci
                call npm test --if-present

                cd/services/product-service
                if exist  package-lock.json call npm ci
                call npm test --if-present

                cd/services/order-service
                if exist  package-lock.json call npm ci
                call npm test --if-present
                '''
            }
        }
        stage("Build Docker Images"){
            steps{
                bat 'docker compose build'
                bat 'docker compose up -d'
            }

        }
        stage("verify containers"){
            steps{
                bat 'docker compose ps'
            }
        }
        post {
            success {
                echo 'application running successfully'
            }
            failure {
                echo 'Pipeline failure check the jenkins file'
            }
        }
    }
}
