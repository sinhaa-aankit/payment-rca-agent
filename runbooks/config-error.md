# Runbook: Configuration Error

## Symptoms
Payment fails, is rejected or parked because of a missing or wrong configuration, mapping or setting, not because of the customer or an outside system.

## Log Signals
- "No entry found in mapping table", "key not found in config"
- "Property is null", "parameter not set", "profile missing field"
- Settings pointing to retired, staging or wrong endpoints
- Unusual values such as very short timeouts or wrong limits loaded from config

## Checks
1. Identify which configuration value, table or file the failing component read.
2. Compare it with the expected value and with other environments.
3. Check recent deployments or config changes around the time failures started.

## Fix
- Correct the configuration value through the normal change process.
- Reprocess the affected payments once the fix is deployed.
- If many payments are affected, pause the flow and communicate before bulk reprocessing.

## Prevention
- Validate required configuration at application startup.
- Keep configuration under version control and review changes.
- Add alerts for sudden spikes in one error code after a deployment.

## Client Communication
"The payment failed due to an internal configuration issue on our side. It has been corrected and the payment has been [reprocessed / scheduled for reprocessing]."
