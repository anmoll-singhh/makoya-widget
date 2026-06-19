-- New sites should expose the two new widget options (readable font, hide images)
-- in their dashboard customizer by default.
alter table site_config
  alter column features_enabled set default array[
    'textSize','lineSpacing','contrast','stopMotion',
    'readingRuler','highlightLinks','bigCursor','readableFont','hideImages'
  ];
