variable "aws_region" {
  type        = string
  description = "AWS region for resources"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Environment identifier (dev, staging, prod)"
  default     = "dev"
}

variable "app_name" {
  type        = string
  description = "Application name prefix for all created resources"
  default     = "serverless-web-app"
}

variable "table_name" {
  type        = string
  description = "DynamoDB table name"
  default     = "serverless-web-application-on-aws"
}

