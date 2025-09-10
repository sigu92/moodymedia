-- Phase 1a: Add system_admin role to enum first
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'system_admin';