> Hemi's original request (27 Nov 2026), kept word for word. This is the spec the Agent Office was built from.

Build a working website called “Agent Office” for my company. I’m the owner. I want to walk into a virtual office, give my team a business assignment in plain English, see who is working on each part, and receive a finished document I can actually use.

Build the project in the current folder. Make sensible design decisions and continue through implementation and testing. On first launch, let me enter my company name, industry, customers, and preferred writing tone. Use editable defaults so I can try the office immediately.

THE FIRST FIVE MINUTES

Design around this experience. I open the website and see my company name on the wall of a furnished, animated office. I click “Give the team a job,” paste meeting notes or attach a sales CSV, and describe what I want. The office manager assigns the right people. I can click anyone’s desk to see their assignment, input, latest update, and actual output. When the work is ready, I can request a revision or approve and download it. Make that journey excellent before adding secondary features.

THE PEOPLE AND THEIR JOBS

Start with five employees. Let me rename them and edit their instructions.

- Office Manager turns my request into a short plan, assigns only the people needed, and assembles the final deliverable.
- Researcher reads the documents and notes I provide, extracts relevant facts, and identifies missing information. Each finding points back to its source.
- Data Analyst works with CSVs. Use code for calculations. Let the language model explain the computed results. Flag missing columns or ambiguous definitions.
- Writer turns the brief and verified findings into a report, action plan, customer email draft, or marketing copy using my company’s tone.
- Reviewer checks the draft against my original request and the supplied evidence. Show what passed, what needs fixing, and who owns the revision.

Pass actual work between employees. For example, the Writer should receive the Analyst’s computed figures, and the Reviewer should see both the final draft and the evidence. Keep jobs bounded. If the team needs a decision from me, ask one specific question and let me resume the job after answering.

THE OFFICE

Create an original, polished 2D pixel-art office viewed from above at a slight angle. Give it a recognizable floor plan, individual desks, a meeting table, a wall task board, warm lighting, and distinct employee characters. Use locally bundled artwork or draw original assets in code.

Make the office itself the main interface. Clicking a desk opens the employee. Clicking the wall board opens all assignments. Clicking a completed job opens its deliverable. Show an employee typing during real work, a folder passing between desks on a real handoff, and a raised hand when my input is needed. Drive these moments from job events. Keep text readable, support reduced motion, and give mobile users a simple employee list with the same controls.

RUN IT WITHOUT ADDITIONAL PAID SERVICES

Use React, TypeScript, and Vite for the interface, a small local Node backend, SQLite for saved work, and Ollama for live AI. Let me select an installed local model. Run one model request at a time by default so several employee roles can share one model on a laptop. Keep company files and live jobs on my computer. Require no credit card, paid API key, paid artwork, or cloud database.

Include a clearly labeled “Try a sample office” button that works immediately without Ollama. It should replay a sample job with inspectable inputs, handoffs, and outputs. In Live mode, report actual progress and errors. If Ollama is offline, preserve my job and show the exact next step to reconnect. Save jobs, outputs, and approvals across refreshes. Keep email and marketing outputs as editable drafts for me to approve and export.

PROVE THE OFFICE DOES REAL WORK

Include a small sample sales CSV and this starter assignment:
“Compare this month’s sales with last month’s. Tell me which product drove the biggest change, show the numbers, and draft a five-sentence update for my team.”

Design the sample so one product has the highest sales, while a different product contributes the largest month-to-month increase. Verify that the Analyst identifies the correct product by change in revenue, the Writer uses those exact figures, and the Reviewer catches an intentionally altered number in a test. Let me download the final update and supporting table. Then let me repeat the same workflow with my own CSV.

Test a second job using only meeting notes: “Turn these notes into an action plan with owners and deadlines.” The manager should skip the Data Analyst. If the notes omit an owner or deadline, the output should say “Unassigned” or “Not specified.” This proves the office adapts to the assignment.

FINISH AND HAND OVER

Use one command to start the app after setup. Run the build and available tests, fix failures, and verify the main workflow in a browser if available. Distinguish what you tested with a live local model from what you tested with sample data. Give me a short beginner-friendly README with exact setup commands, how to choose a model that fits my computer, and how to change my company or employees. Also explain how to publish the sample office on free static hosting while keeping private jobs and uploads on my computer.

Prioritize a complete working assignment, accurate results, and a memorable office over extra screens. Finish with the exact command I should run and the first thing I should click.