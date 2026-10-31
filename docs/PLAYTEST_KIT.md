# Playtest kit

## 1. Recruiting message (WhatsApp / class group)
> Hey! We built a sci-fi data science game for our DS project (Pipeline Quest). Need 6-10 people for a 25-minute test: 5 min quiz, ~15 min play, 5 min feedback. Your tag stays anonymous and only goes into our project report. Pick a slot: [link]. Please use a laptop and Chrome. Nobody needs prior experience; beginners are the most useful testers.

Target n = 8 to 10, mix of strong and weaker students. Run sessions in person or on a call with screen share so you can observe.

## 2. Protocol (per participant, ~25 min)
1. Consent line: tag anonymous, data used only for course evaluation.
2. Pre-test (Google Form, section 3). Ask them to put their **player tag** in the form so it can be joined to telemetry.
3. Play Pipeline Quest. Do not help unless stuck for 2+ minutes (note the sector and what you said).
4. Post-test: the same 9 questions in a different order.
5. Feedback form (section 4).
Observer sheet per player: sector stuck on, time stuck, quote, confusion about rules.

## 3. Pre/post test (identical questions, shuffle order for post). Answer key in bold.
1. A detector says "no jammer" for every frame in a dataset where 10% of frames contain a jammer. Its accuracy and probability of detection are: **90% and 0%** / 10% and 90% / 90% and 90% / 50% and 50%.
2. A 3 kHz tone is sampled at 4 kHz. Where does it appear in the spectrum? 3 kHz / **1 kHz** / 4 kHz / 7 kHz.
3. A waveform has flat tops at a fixed level. Most likely cause: **clipping (ADC saturation)** / dropout / DC offset / aliasing.
4. Data has Gaussian noise and isolated large spikes. First filter: **median** / moving average / either, order does not matter / none.
5. After cleaning, noise standard deviation fell 80%. Is cleaning successful? Yes / **Not proven: also check signal power kept and residual DC** / Yes if the plot looks smooth / No, noise must be zero.
6. On a spectrogram, a straight diagonal line indicates: **a frequency sweep (chirp)** / a constant carrier / broadband noise / a dropout.
7. Lowering a detector's threshold will: **raise both Pd and Pfa** / raise Pd, lower Pfa / lower both / change neither.
8. Training error is near zero but validation error is high. This indicates: underfitting / **overfitting** / good generalisation / data leakage only.
9. A miss costs 3 times a false alarm. Compared with the equal-error threshold, the cost-optimal threshold should be: **lower** / higher / identical / unrelated.

Scoring: 1 point each, max 9. Normalised gain per student g = (post − pre) / (9 − pre); skip students with pre = 9. Report mean pre, mean post, mean g, and n. Do not drop students who did badly.

## 4. Feedback form
Likert 1-5 (strongly disagree to strongly agree): The goal was clear. I understood why I lost fuel. I felt I discovered something by playing. The difficulty was right. The UI was easy to use. I would recommend this to a classmate.
Open: Which sector was most confusing? What did you learn that you did not know before? One thing to change?

## 5. Turning data into evidence
- Telemetry (needs `supabase/telemetry.sql` and the dashboard snippet): run the two queries at the bottom of that file. Report first-try clear % per sector and the funnel.
- Joined with the Google Form via player tag: per-student gain vs mistakes made.
- Write the "what we changed" list honestly, e.g. "Sector X had N% first-try clears, so we changed Y". Commit that change and cite the commit.
