-- Migration: add budget column to projects
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run

alter table public.projects
  add column if not exists budget_hours numeric(10,2);
