# Runbook: Invalid Beneficiary

## Symptoms
Payment is rejected, failed or parked at the credit step. The beneficiary account does not exist, is inactive, closed or dormant, or the name does not match the account.

## Log Signals
- "Account not found", "no record", "lookup failed"
- "Account status inactive", "dormant", "closed", "frozen"
- "Name mismatch", "match score below threshold"

## Checks
1. Verify the beneficiary account number and bank code submitted by the client.
2. Check the account status returned by the beneficiary bank.
3. If the debit already happened, confirm whether an automatic reversal was triggered.

## Fix
- Ask the client to confirm or correct the beneficiary details and resubmit.
- If the remitter was debited and no reversal happened, initiate a manual reversal.

## Prevention
- Validate beneficiary details (account lookup or name check) before debiting.
- Keep beneficiary master data updated for repeat payees.

## Client Communication
"The payment could not be credited because the beneficiary account details could not be verified [account not found / inactive / name mismatch]. Please confirm the details and resubmit."
