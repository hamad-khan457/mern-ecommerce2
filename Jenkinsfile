pipeline {

    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-credentials')
        DOCKERHUB_USERNAME    = "${DOCKERHUB_CREDENTIALS_USR}"
        IMAGE_BACKEND         = "hamad457/ecommerce-backend"
        IMAGE_FRONTEND        = "hamad457/ecommerce-frontend"
        EC2_IP                = "13.51.161.161"
    }

    triggers {
        githubPush()
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Cloning repository from GitHub...'
                checkout scm
            }
        }

        stage('Build Backend Image') {
            steps {
                echo 'Building backend Docker image...'
                dir('backend') {
                    script {
                        backendImage = docker.build("${IMAGE_BACKEND}:latest", '.')
                    }
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                echo 'Building frontend Docker image...'
                dir('frontend') {
                    script {
                        frontendImage = docker.build(
                            "${IMAGE_FRONTEND}:latest",
                            "--build-arg VITE_API_URL=http://${EC2_IP}:5000 ."
                        )
                    }
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo 'Pushing images to Docker Hub...'
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'dockerhub-credentials') {
                        backendImage.push('latest')
                        frontendImage.push('latest')
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Starting containerized build environment...'
                sh '''
                    docker compose -f docker-compose.jenkins.yml down --remove-orphans || true
                    docker compose -f docker-compose.jenkins.yml up -d
                '''
            }
        }

        stage('Health Check') {
            steps {
                echo 'Verifying containers are healthy...'
                sh '''
                    sleep 15
                    docker compose -f docker-compose.jenkins.yml ps
                '''
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Cleaning up...'
            sh 'docker compose -f docker-compose.jenkins.yml down --remove-orphans || true'
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}
