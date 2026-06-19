-- Widget config v3: new per-site scalar options + 6 new default features.
alter table site_config
  add column if not exists launcher_size              text not null default 'md',
  add column if not exists default_profile            text not null default 'none',
  add column if not exists accessibility_statement_url text not null default '',
  add column if not exists default_language           text not null default 'en',
  add column if not exists panel_title                text not null default '';

-- New sites get all 15 features in the customizer by default.
alter table site_config
  alter column features_enabled set default array[
    'textSize','lineSpacing','contrast','stopMotion','readingRuler',
    'highlightLinks','bigCursor','readableFont','hideImages',
    'saturation','readingMask','highlightTitles','textAlign','muteSounds','readAloud'
  ];

-- Backfill existing rows so current sites also expose the new toggles.
update site_config
  set features_enabled = array[
    'textSize','lineSpacing','contrast','stopMotion','readingRuler',
    'highlightLinks','bigCursor','readableFont','hideImages',
    'saturation','readingMask','highlightTitles','textAlign','muteSounds','readAloud'
  ]
  where not ('saturation' = any(features_enabled));
