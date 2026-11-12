#!/usr/bin/env python3
"""Decide whether CI may skip its test jobs. Any doubt runs the full suite.

Tests are skipped only when:
- the change touches documentation alone, on a branch in SKIPPABLE_TARGETS; or
- a push merges a pull request whose exact tree already passed the required test
  jobs in pull request CI, on a branch in TREE_REUSE_TARGETS (this includes main).

The workflow and its required test jobs come from CI_WORKFLOW and CI_REQUIRED_JOBS,
so the same rules serve ci.yml and real-api-e2e.yml.
"""
import json
import os
import subprocess
import sys

SKIPPABLE_TARGETS = {"developer", "dev-local"}
# main never skips documentation-only changes; it only reuses a proven identical tree.
TREE_REUSE_TARGETS = SKIPPABLE_TARGETS | {"main"}
# Markdown under these folders can be shipped or imported by the application.
ROOTS_WHERE_MARKDOWN_IS_CODE = ("src/", "public/")
DEFAULT_WORKFLOW = "ci.yml"
DEFAULT_REQUIRED_JOBS = ("Unit tests and build", "E2E (", "Responsive smoke matrix")


def is_documentation(path):
    if path.startswith(ROOTS_WHERE_MARKDOWN_IS_CODE):
        return False
    return path.startswith("docs/") or path.lower().endswith(".md")


def only_documentation(paths):
    return bool(paths) and all(is_documentation(path) for path in paths)


def required_jobs_passed(jobs, required):
    """jobs: [(name, conclusion)]. Every required name prefix must match a job, and
    every matching job must have succeeded (a skipped test job proves nothing)."""
    if not required:
        return False
    for prefix in required:
        matching = [conclusion for name, conclusion in jobs if name.startswith(prefix)]
        if not matching or any(conclusion != "success" for conclusion in matching):
            return False
    return True


class Repository:
    def __init__(self, name=None, workflow=DEFAULT_WORKFLOW, required_jobs=DEFAULT_REQUIRED_JOBS):
        self.name = name
        self.workflow = workflow
        self.required_jobs = tuple(required_jobs)

    @staticmethod
    def _run(*command):
        return subprocess.run(command, check=True, capture_output=True, text=True).stdout.strip()

    def changed(self, base, head):
        # Without --no-renames, moving code into docs/ would list only the new path.
        output = self._run("git", "diff", "--no-renames", "--name-only", base, head)
        return output.splitlines()

    def parents(self, commit):
        return self._run("git", "rev-list", "--parents", "-n", "1", commit).split()[1:]

    def tree(self, commit):
        return self._run("git", "rev-parse", f"{commit}^{{tree}}")

    def is_ancestor(self, ancestor, commit):
        return subprocess.run(["git", "merge-base", "--is-ancestor", ancestor, commit]).returncode == 0

    def _successful_runs(self, sha, event=None, limit=1):
        query = f"head_sha={sha}&status=success&per_page={limit}"
        if event:
            query += f"&event={event}"
        return self._run(
            "gh", "api", f"repos/{self.name}/actions/workflows/{self.workflow}/runs?{query}",
            "--jq", ".workflow_runs[].id").split()

    def ci_succeeded(self, sha, event=None):
        return bool(self._successful_runs(sha, event))

    def pull_request_tested(self, sha):
        for run_id in self._successful_runs(sha, "pull_request", limit=10):
            output = self._run(
                "gh", "api", f"repos/{self.name}/actions/runs/{run_id}/jobs?per_page=100",
                "--jq", "[.jobs[] | [.name, .conclusion]]")
            if required_jobs_passed([tuple(job) for job in json.loads(output or "[]")], self.required_jobs):
                return True
        return False


def decide(event, target, before, repo):
    """Return (run_tests, reason)."""
    if target not in TREE_REUSE_TARGETS:
        return True, f"target {target or 'unknown'} always runs the full suite"
    docs_may_skip = target in SKIPPABLE_TARGETS

    if event == "pull_request":
        if docs_may_skip and only_documentation(repo.changed("HEAD^1", "HEAD")):
            return False, "pull request changes documentation only"
        return True, "pull request always runs the full suite" if not docs_may_skip else "pull request changes code"

    if event != "push" or not before or set(before) == {"0"}:
        return True, "no previous commit to compare"

    if docs_may_skip and only_documentation(repo.changed(before, "HEAD")) and repo.ci_succeeded(before):
        return False, "push changes documentation only, on top of a commit that passed CI"

    parents = repo.parents("HEAD")
    if len(parents) == 2:
        base, pull_request_head = parents
        # The base is an ancestor of the PR head, so every merge CI tested had this same tree.
        if (base == before
                and repo.is_ancestor(base, pull_request_head)
                and repo.tree(pull_request_head) == repo.tree("HEAD")
                and repo.pull_request_tested(pull_request_head)):
            return False, "merge has the exact tree whose test jobs passed in pull request CI"

    return True, "push was not proven to be already tested"


def main():
    event = os.environ.get("GITHUB_EVENT_NAME", "")
    target = os.environ.get("GITHUB_BASE_REF") or os.environ.get("GITHUB_REF_NAME", "")
    required = os.environ.get("CI_REQUIRED_JOBS")
    try:
        repo = Repository(
            os.environ.get("GITHUB_REPOSITORY"),
            os.environ.get("CI_WORKFLOW") or DEFAULT_WORKFLOW,
            [job.strip() for job in required.split(",") if job.strip()] if required else DEFAULT_REQUIRED_JOBS)
        run_tests, reason = decide(event, target, os.environ.get("EVENT_BEFORE", ""), repo)
    except Exception as error:  # A failed check must never skip tests.
        run_tests, reason = True, f"scope check failed ({type(error).__name__})"
    print(f"run_tests={str(run_tests).lower()}: {reason}")
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        output.write(f"run_tests={str(run_tests).lower()}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
