-- Split Physical into outfield vs goalkeeper variants, U10-U11 up (matching
-- how Technical/Tactical already split by position at that level). Below
-- U10-U11, Physical stays a single shared set, since positions aren't fixed
-- yet at that age.

-- 1. Relabel the existing shared Physical questions (U10-U11 up) from
--    'all' to 'outfield' - these are now the outfield-only set.
update public.master_questions
set variant = 'outfield'
where pillar_id = 'physical'
  and variant = 'all'
  and age_band in ('U10-U11', 'U12-U13', 'U14-U15', 'U16-U17');

-- 2. Add 16 new goalkeeper-specific Physical questions (4 per age band).
insert into public.master_questions
  (id, age_band, pillar_id, variant, order_index, question_text, anchor_1, anchor_2, anchor_3, anchor_4, anchor_5)
values
('PHY-GK-U10U11-1', 'U10-U11', 'physical', 'goalkeeper', 1,
  'Does the goalkeeper stay alert and ready throughout the game?',
  'Switches off; caught unprepared for shots.',
  'Alert only when the ball is close.',
  'Ready for routine situations, slow otherwise.',
  'Stays alert and ready for most of the game.',
  'Constantly alert; ready for every situation.'),
('PHY-GK-U10U11-2', 'U10-U11', 'physical', 'goalkeeper', 2,
  'Is the goalkeeper strong enough to compete for crosses and in the box?',
  'Overpowered in any contact situation.',
  'Competes only against weaker challenges.',
  'Holds up in straightforward situations.',
  'Strong enough to compete for most crosses.',
  'Dominant physically; wins contests in the box.'),
('PHY-GK-U10U11-3', 'U10-U11', 'physical', 'goalkeeper', 3,
  'Does the goalkeeper react quickly to shots and crosses?',
  'Slow to react; beaten by straightforward shots.',
  'Reacts late to anything but easy shots.',
  'Reacts well to shots hit straight at them.',
  'Reacts quickly to shots and crosses.',
  'Lightning reactions; gets to shots others wouldn''t reach.'),
('PHY-GK-U10U11-4', 'U10-U11', 'physical', 'goalkeeper', 4,
  'Can the goalkeeper get back on their feet quickly after diving or falling?',
  'Slow to get up; not ready for a follow-up.',
  'Takes a while to reset after going down.',
  'Gets up in time for straightforward situations.',
  'Gets back up quickly, ready to react again.',
  'Springs back up instantly, ready for anything.'),

('PHY-GK-U12U13-1', 'U12-U13', 'physical', 'goalkeeper', 1,
  'Does the goalkeeper maintain concentration and readiness for the full game?',
  'Switches off for long spells.',
  'Alert only when under obvious pressure.',
  'Ready for most of the game.',
  'Maintains readiness for the full game.',
  'Fully switched on from first minute to last.'),
('PHY-GK-U12U13-2', 'U12-U13', 'physical', 'goalkeeper', 2,
  'Is the goalkeeper strong enough to deal with physical challenges in the box?',
  'Easily overpowered in the box.',
  'Copes only with light challenges.',
  'Handles straightforward physical challenges.',
  'Strong enough for most physical challenges.',
  'Physically dominant; controls the box under pressure.'),
('PHY-GK-U12U13-3', 'U12-U13', 'physical', 'goalkeeper', 3,
  'Does the goalkeeper show quick reactions and footwork?',
  'Slow reactions; beaten by routine situations.',
  'Reactions and footwork are a step behind.',
  'Sound reactions in straightforward situations.',
  'Quick reactions and footwork under pressure.',
  'Exceptional reactions; footwork rarely lets them down.'),
('PHY-GK-U12U13-4', 'U12-U13', 'physical', 'goalkeeper', 4,
  'Can the goalkeeper make repeated saves without tiring?',
  'Struggles after one save; slow to recover.',
  'Recovery between saves is often too slow.',
  'Recovers for straightforward, spaced-out situations.',
  'Makes repeated saves without tiring.',
  'Recovers instantly; every save as sharp as the first.'),

('PHY-GK-U14U15-1', 'U14-U15', 'physical', 'goalkeeper', 1,
  'Does the goalkeeper sustain concentration and physical readiness all match?',
  'Concentration and readiness drop off noticeably.',
  'Struggles to stay switched on past halfway.',
  'Holds readiness until the closing stages.',
  'Sustains concentration and readiness for the full match.',
  'Fully switched on even in the last minute.'),
('PHY-GK-U14U15-2', 'U14-U15', 'physical', 'goalkeeper', 2,
  'Is the goalkeeper physically dominant in one-on-ones and the box?',
  'Overpowered in one-on-ones and the box.',
  'Competes but comes off second best.',
  'Competitive against similar physical opponents.',
  'Physically dominant in most one-on-ones.',
  'Commanding physical presence; rarely bested in the box.'),
('PHY-GK-U14U15-3', 'U14-U15', 'physical', 'goalkeeper', 3,
  'Does the goalkeeper show explosive reactions across the goal?',
  'Lacks explosiveness; beaten to routine saves.',
  'Explosive only in central, easy situations.',
  'Reasonably explosive across the goal.',
  'Shows explosive reactions across the goal.',
  'Elite explosiveness; reaches saves that seem out of range.'),
('PHY-GK-U14U15-4', 'U14-U15', 'physical', 'goalkeeper', 4,
  'Can the goalkeeper repeat high-intensity efforts without fading?',
  'One big save, then noticeably slower after.',
  'Second and third efforts drop off fast.',
  'Repeats efforts, but tires late in the game.',
  'Repeats high-intensity efforts with little drop-off.',
  'Repeats maximal efforts throughout the match.'),

('PHY-GK-U16U17-1', 'U16-U17', 'physical', 'goalkeeper', 1,
  'Does the goalkeeper maintain elite concentration and readiness all game?',
  'Concentration lapses cost the team.',
  'Noticeable dips in readiness during the game.',
  'Holds readiness until the final stages.',
  'Maintains elite concentration for the whole game.',
  'Unwavering focus and readiness from start to finish.'),
('PHY-GK-U16U17-2', 'U16-U17', 'physical', 'goalkeeper', 2,
  'Is the goalkeeper physically commanding in the box and in duels?',
  'Physically overmatched in the box.',
  'Competes physically only against weaker attackers.',
  'Holds their own against most attackers.',
  'Physically commanding in the box and duels.',
  'Dominant physical presence; controls their box.'),
('PHY-GK-U16U17-3', 'U16-U17', 'physical', 'goalkeeper', 3,
  'Does the goalkeeper show explosive power and reach when it matters?',
  'Lacks explosive power in key moments.',
  'Rarely produces a decisive burst of power.',
  'Shows explosive power in some situations.',
  'Produces explosive power and reach when it matters.',
  'Explosively powerful; makes saves that look impossible.'),
('PHY-GK-U16U17-4', 'U16-U17', 'physical', 'goalkeeper', 4,
  'Can the goalkeeper recover quickly between high-intensity efforts?',
  'Needs a long rest after each save.',
  'Slow to recover; sharpness drops off.',
  'Recovers adequately in normal passages.',
  'Recovers quickly between intense efforts.',
  'Near-instant recovery; ready to go again immediately.')
on conflict (id) do nothing;

-- 3. Relabel existing teams' already-copied Physical questions to match,
--    skipping any question a coach has already customised.
update public.team_questions tq
set variant = 'outfield'
from public.master_questions mq
where tq.source_master_id = mq.id
  and tq.is_custom = false
  and mq.pillar_id = 'physical'
  and mq.variant = 'outfield'
  and mq.age_band in ('U10-U11', 'U12-U13', 'U14-U15', 'U16-U17');

-- 4. Backfill the new goalkeeper Physical questions into every existing
--    team whose age band has them (idempotent: skips any team_id/
--    source_master_id pair that already exists).
insert into public.team_questions
  (team_id, pillar_id, variant, source_master_id, order_index, question_text, anchor_1, anchor_2, anchor_3, anchor_4, anchor_5, is_custom)
select
  t.id, mq.pillar_id, mq.variant, mq.id, mq.order_index, mq.question_text,
  mq.anchor_1, mq.anchor_2, mq.anchor_3, mq.anchor_4, mq.anchor_5, false
from public.teams t
join public.master_questions mq
  on mq.age_band = t.age_band and mq.pillar_id = 'physical' and mq.variant = 'goalkeeper'
where not exists (
  select 1 from public.team_questions tq
  where tq.team_id = t.id and tq.source_master_id = mq.id
);
