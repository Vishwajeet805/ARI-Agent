<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- DayPilot logic lives in `src/lib/daypilot/` (planner, tools, types) as pure modules; UI only dispatches — keeps the agent testable without rendering.
- The planner is deterministic and rule-based with no network/LLM — the demo must run offline and make no unsupported AI/Alexa claims.
- App state persists to localStorage only (no backend) — no-login hackathon demo.
