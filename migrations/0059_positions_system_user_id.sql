-- Every position must have a user_id. System positions (counterparty when maker has no user, rounding residuals)
-- used to have user_id NULL; they now use reserved user_id = 0 (SYSTEM_USER_ID). Application code no longer
-- inserts or updates positions with user_id NULL.
UPDATE positions SET user_id = 0 WHERE user_id IS NULL;
