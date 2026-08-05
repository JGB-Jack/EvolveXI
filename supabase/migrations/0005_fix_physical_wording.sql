-- Fix: several Physical questions (U10-U11 up) were worded around
-- outfield-only scenarios (racing an opponent to a loose ball, shielding
-- the ball, defensive recovery runs) even though Physical is shared across
-- all positions, including goalkeepers. Reworded to describe the same
-- underlying physical quality without an outfield-only scenario.
--
-- Applied in two steps: update the master bank (so new teams onboarding
-- from here get the corrected wording), then update any team_questions
-- copies that still match the original master wording (is_custom = false),
-- so existing teams get the fix too without touching any coach's own edits.

update public.master_questions set
  question_text = 'Is the player quick to accelerate over short distances?',
  anchor_1 = 'Slow to get going; struggles for a quick start.',
  anchor_2 = 'Reaches a good pace, but too slowly to matter.',
  anchor_3 = 'Accelerates well when the situation is straightforward.',
  anchor_4 = 'Accelerates quickly whenever it''s needed.',
  anchor_5 = 'Explosive acceleration; reacts first in almost every situation.'
where id = 'PHY-ALL-U10U11-2';

update public.master_questions set
  question_text = 'Does the player compete well in physical challenges?',
  anchor_1 = 'Backs out of physical challenges.',
  anchor_2 = 'Competes only when sure to win.',
  anchor_3 = 'Contests some challenges, avoids others.',
  anchor_4 = 'Competes for most physical challenges.',
  anchor_5 = 'Relishes physical contests and wins most of them.'
where id = 'PHY-ALL-U10U11-4';

update public.master_questions set
  question_text = 'Does the player maintain effort and intensity for the full game?',
  anchor_1 = 'Tires early; noticeable drop-off after a few minutes.',
  anchor_2 = 'Fades well before the final whistle.',
  anchor_3 = 'Holds up until late, then drops off.',
  anchor_4 = 'Keeps working hard for the full game.',
  anchor_5 = 'Maintains high intensity tirelessly the whole match.'
where id = 'PHY-ALL-U12U13-1';

update public.master_questions set
  question_text = 'Is the player strong and difficult to knock off balance?',
  anchor_1 = 'Easily knocked off balance by contact.',
  anchor_2 = 'Holds up only against weaker opponents.',
  anchor_3 = 'Holds firm in some physical situations.',
  anchor_4 = 'Strong and hard to knock off balance.',
  anchor_5 = 'Very strong; rarely loses a physical contest.'
where id = 'PHY-ALL-U12U13-2';

update public.master_questions set
  question_text = 'Does the player show good pace over short distances?',
  anchor_1 = 'Beaten for pace in most situations.',
  anchor_2 = 'Loses most sprints or quick bursts.',
  anchor_3 = 'Competitive pace when starting on level terms.',
  anchor_4 = 'Regularly quicker than those around them.',
  anchor_5 = 'Rapid; quick even from a standing start.'
where id = 'PHY-ALL-U12U13-3';

update public.master_questions set
  question_text = 'Can the player repeat quick efforts without tiring?',
  anchor_1 = 'One effort, then stops or slows badly.',
  anchor_2 = 'Slow to reset after each effort.',
  anchor_3 = 'Resets when the situation is obvious.',
  anchor_4 = 'Repeats quick efforts when needed.',
  anchor_5 = 'Repeats quick efforts without dropping off.'
where id = 'PHY-ALL-U12U13-4';

update public.master_questions set
  question_text = 'Is the player strong and competitive in physical contests?',
  anchor_1 = 'Loses most physical contests.',
  anchor_2 = 'Competes but comes off second best.',
  anchor_3 = 'Competitive against similar opponents.',
  anchor_4 = 'Wins most physical contests comfortably.',
  anchor_5 = 'Dominant physically; rarely comes off worse.'
where id = 'PHY-ALL-U14U15-2';

update public.master_questions set
  question_text = 'Does the player have pace that makes a difference?',
  anchor_1 = 'Lacks the pace to make a difference.',
  anchor_2 = 'Rarely uses pace to good effect.',
  anchor_3 = 'Pace helps in some situations.',
  anchor_4 = 'Uses pace to good effect regularly.',
  anchor_5 = 'Genuinely quick; pace is a real weapon.'
where id = 'PHY-ALL-U14U15-3';

update public.master_questions set
  question_text = 'Can the player repeat high-intensity efforts without fading?',
  anchor_1 = 'One effort, then noticeably slower.',
  anchor_2 = 'Second and third efforts drop off fast.',
  anchor_3 = 'Repeats efforts, but tires by late game.',
  anchor_4 = 'Repeats efforts with little drop-off.',
  anchor_5 = 'Repeats maximal efforts throughout the game.'
where id = 'PHY-ALL-U14U15-4';

update public.master_questions set
  question_text = 'Is the player strong and robust in physical contests?',
  anchor_1 = 'Weak in contact; easily knocked off balance.',
  anchor_2 = 'Competes physically only against weaker opponents.',
  anchor_3 = 'Holds their own in most physical contests.',
  anchor_4 = 'Strong and robust in physical contests.',
  anchor_5 = 'Physically imposing; dominant in every contest.'
where id = 'PHY-ALL-U16U17-2';

update public.master_questions set
  anchor_5 = 'Near-instant recovery; ready to go again immediately.'
where id = 'PHY-ALL-U16U17-4';

-- Propagate to existing teams' live question sets, but only where the
-- coach hasn't already customised that question themselves.
update public.team_questions tq set
  question_text = mq.question_text,
  anchor_1 = mq.anchor_1,
  anchor_2 = mq.anchor_2,
  anchor_3 = mq.anchor_3,
  anchor_4 = mq.anchor_4,
  anchor_5 = mq.anchor_5,
  updated_at = now()
from public.master_questions mq
where tq.source_master_id = mq.id
  and tq.is_custom = false
  and mq.id in (
    'PHY-ALL-U10U11-2', 'PHY-ALL-U10U11-4',
    'PHY-ALL-U12U13-1', 'PHY-ALL-U12U13-2', 'PHY-ALL-U12U13-3', 'PHY-ALL-U12U13-4',
    'PHY-ALL-U14U15-2', 'PHY-ALL-U14U15-3', 'PHY-ALL-U14U15-4',
    'PHY-ALL-U16U17-2', 'PHY-ALL-U16U17-4'
  );
