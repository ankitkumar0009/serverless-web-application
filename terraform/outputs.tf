output "api_gateway_endpoint" {
  description = "Base URL of the AWS API Gateway HTTP API"
  value       = aws_apigatewayv2_stage.default_stage.invoke_url
}

output "s3_website_endpoint" {
  description = "Direct S3 Website Hosting Endpoint"
  value       = aws_s3_bucket_website_configuration.frontend_website.website_endpoint
}

output "cloudfront_domain_name" {
  description = "CloudFront CDN distribution URL"
  value       = "https://${aws_cloudfront_distribution.cdn.domain_name}"
}

output "dynamodb_table_name" {
  description = "Name of the created DynamoDB Table"
  value       = aws_dynamodb_table.items_table.name
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.api_handler.function_name
}
