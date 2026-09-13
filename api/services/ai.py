"""Backend AI service abstraction.

The demo service is deliberately deterministic and dependency-free so the
application is useful without an API key or network access. A real provider
can replace ``DemoAIService`` while keeping the ``complete`` contract.
"""
import re


class DemoAIService:
    """Generate useful study material from the note context supplied by Django."""

    def complete(self, prompt, context="", history=None):
        del history
        title, content = self._parse_context(context)
        action = self._detect_action(prompt)
        if not content:
            return (
                f'DEMO MODE: The note "{title or "selected note"}" is empty. '
                "Add some study content, then try this action again."
            ), None

        sentences = self._sentences(content)
        key_points = sentences[:5]
        if action == "summarize":
            answer = self._summary(title, key_points)
        elif action == "quiz":
            answer = self._quiz(title, key_points)
        elif action == "flashcards":
            answer = self._flashcards(title, key_points)
        elif action == "study-plan":
            answer = self._study_plan(title, key_points)
        else:
            answer = self._ask(title, content, key_points, prompt)
        return f"DEMO MODE\n\n{answer}", None

    @staticmethod
    def _parse_context(context):
        title = ""
        content = context or ""
        if content.startswith("Title:"):
            title, _, content = content.partition("\n")
            title = title.removeprefix("Title:").strip()
        return title, content.strip()

    @staticmethod
    def _sentences(content):
        parts = re.split(r"(?<=[.!?])\s+|\n+", content.strip())
        return [part.strip(" -•\t") for part in parts if part.strip(" -•\t")][:8]

    @staticmethod
    def _detect_action(prompt):
        lowered = prompt.lower()
        for action, words in {
            "summarize": ("summarize",),
            "quiz": ("quiz",),
            "flashcards": ("flashcard",),
            "study-plan": ("study plan",),
        }.items():
            if any(word in lowered for word in words):
                return action
        return "ask"

    @staticmethod
    def _summary(title, points):
        bullets = "\n".join(f"- {point}" for point in points)
        return f"Summary of {title or 'your note'}:\n{bullets}\n\nTakeaway: Review these ideas once, then explain them in your own words."

    @staticmethod
    def _quiz(title, points):
        questions = []
        for index, point in enumerate(points[:5], 1):
            questions.append(
                f"{index}. What is the main idea in this note section: \"{point}\"?\n"
                f"   Answer: Explain the key concept from that section in your own words."
            )
        return f"Practice quiz for {title or 'your note'}:\n" + "\n".join(questions)

    @staticmethod
    def _flashcards(title, points):
        cards = []
        for index, point in enumerate(points[:5], 1):
            cards.append(
                f"{index}. Front: What should you remember about \"{point}\"?\n"
                "   Back: Restate the concept and connect it to the note's main theme."
            )
        return f"Flashcards for {title or 'your note'}:\n" + "\n".join(cards)

    @staticmethod
    def _study_plan(title, points):
        focus = points[0] if points else "the main concepts"
        return (
            f"25-minute study plan for {title or 'your note'}:\n"
            f"1. 5 minutes - Preview the note and identify the main idea: {focus}\n"
            "2. 10 minutes - Read actively and write one question for each key point.\n"
            "3. 5 minutes - Cover the note and recall the answers from memory.\n"
            "4. 5 minutes - Use the quiz or flashcards, then mark what needs review."
        )

    @staticmethod
    def _ask(title, content, points, prompt):
        lowered = prompt.lower()
        matching = [point for point in points if any(word in point.lower() for word in lowered.split() if len(word) > 3)]
        evidence = matching[:2] or points[:2]
        evidence_text = "\n- ".join(evidence)
        return (
            f"About {title or 'your note'}: Based on the note, "
            f"the most relevant ideas are:\n- {evidence_text}\n\n"
            f"Demo response to your question: {prompt}\n"
            f"Use this note evidence ({len(content.split())} words) to verify the answer, "
            "then write a one-sentence explanation from memory."
        )


demo_service = DemoAIService()


def complete(prompt, context="", history=None):
    """Stable service entry point used by API views."""
    return demo_service.complete(prompt, context, history)
