from __future__ import annotations

from bs4 import BeautifulSoup

from app.auditors.base import (
    AuditCheck,
    AuditContext,
    AuditResult,
    Category,
    Issue,
    Severity,
)


class AccessibilityAuditor:
    """Basic non-invasive accessibility checks (Plan §7).

    No WCAG compliance or legal claims.
    """

    category = Category.ACCESSIBILITY

    def audit(self, ctx: AuditContext) -> AuditResult:
        checks: list[AuditCheck] = []

        soup = BeautifulSoup(ctx.html, "lxml") if ctx.html else None

        checks.append(self._check_img_alt(soup))
        checks.append(self._check_html_lang(soup))
        checks.append(self._check_form_labels(soup))

        return AuditResult(category=self.category, checks=checks)

    # ------------------------------------------------------------------

    @staticmethod
    def _check_img_alt(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="Image alt attributes",
                passed=True,
                weight=40,
                details="No HTML to analyze",
            )

        images = soup.find_all("img")
        if not images:
            return AuditCheck(
                name="Image alt attributes",
                passed=True,
                weight=40,
                details="No images found",
            )

        missing_alt: list[str] = []
        for img in images:
            if not img.has_attr("alt"):
                src = img.get("src", "unknown")[:60]
                missing_alt.append(src)

        total = len(images)
        missing = len(missing_alt)
        passed = missing == 0
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Images missing alt attributes",
                    severity=Severity.MEDIUM,
                    category=Category.ACCESSIBILITY,
                    explanation=f"{missing} out of {total} images are missing alt attributes. Screen readers rely on alt text to describe images to visually impaired users.",
                    recommendation="Add descriptive alt attributes to all images. Use alt=\"\" for decorative images.",
                )
            )
        return AuditCheck(
            name="Image alt attributes",
            passed=passed,
            weight=40,
            details=f"{missing}/{total} images missing alt",
            issues=issues,
        )

    @staticmethod
    def _check_html_lang(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="HTML lang attribute",
                passed=False,
                weight=30,
                details="No HTML to analyze",
                issues=[
                    Issue(
                        name="Missing lang attribute",
                        severity=Severity.MEDIUM,
                        category=Category.ACCESSIBILITY,
                        explanation="Could not parse HTML to check for the lang attribute.",
                        recommendation="Ensure the page returns valid HTML.",
                    )
                ],
            )

        html_tag = soup.find("html")
        if not html_tag:
            return AuditCheck(
                name="HTML lang attribute",
                passed=False,
                weight=30,
                details="No <html> tag found",
                issues=[
                    Issue(
                        name="Missing lang attribute",
                        severity=Severity.MEDIUM,
                        category=Category.ACCESSIBILITY,
                        explanation="The page does not have a proper <html> tag.",
                        recommendation="Ensure the page has a valid <html> tag with a lang attribute.",
                    )
                ],
            )

        lang = html_tag.get("lang", "").strip()
        passed = bool(lang)
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Missing HTML lang attribute",
                    severity=Severity.MEDIUM,
                    category=Category.ACCESSIBILITY,
                    explanation="The <html> tag does not have a lang attribute. The lang attribute helps screen readers use the correct pronunciation and helps browsers offer translation.",
                    recommendation='Add a lang attribute to the <html> tag (e.g., <html lang="en">).',
                )
            )
        return AuditCheck(
            name="HTML lang attribute",
            passed=passed,
            weight=30,
            details=f"lang=\"{lang}\"" if lang else "Not set",
            issues=issues,
        )

    @staticmethod
    def _check_form_labels(soup: BeautifulSoup | None) -> AuditCheck:
        if not soup:
            return AuditCheck(
                name="Form label association",
                passed=True,
                weight=30,
                details="No HTML to analyze",
            )

        inputs = soup.find_all(
            "input",
            attrs={"type": lambda v: v is None or v.lower() not in ("hidden", "submit", "button", "reset", "image")},
        )
        # Also check select and textarea
        inputs.extend(soup.find_all("select"))
        inputs.extend(soup.find_all("textarea"))

        if not inputs:
            return AuditCheck(
                name="Form label association",
                passed=True,
                weight=30,
                details="No form inputs found",
            )

        # Collect all label[for] values
        labels = soup.find_all("label")
        label_for_ids = {
            label.get("for", "").strip()
            for label in labels
            if label.get("for", "").strip()
        }

        unlabeled: list[str] = []
        for inp in inputs:
            input_id = inp.get("id", "").strip()
            has_label = input_id and input_id in label_for_ids
            has_aria_label = inp.has_attr("aria-label") or inp.has_attr("aria-labelledby")
            has_title = inp.has_attr("title")
            # Check if the input is wrapped in a label
            wrapped_in_label = inp.find_parent("label") is not None

            if not (has_label or has_aria_label or has_title or wrapped_in_label):
                name = inp.get("name", inp.get("id", inp.name))
                unlabeled.append(str(name)[:40])

        total = len(inputs)
        missing = len(unlabeled)
        passed = missing == 0
        issues: list[Issue] = []
        if not passed:
            issues.append(
                Issue(
                    name="Form inputs without labels",
                    severity=Severity.MEDIUM,
                    category=Category.ACCESSIBILITY,
                    explanation=f"{missing} out of {total} form inputs are not associated with a label. Labels help screen readers identify form fields.",
                    recommendation="Associate each form input with a <label> using the 'for' attribute matching the input's 'id', or use aria-label/aria-labelledby.",
                )
            )
        return AuditCheck(
            name="Form label association",
            passed=passed,
            weight=30,
            details=f"{missing}/{total} inputs without labels",
            issues=issues,
        )
