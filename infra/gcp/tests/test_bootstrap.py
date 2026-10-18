import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("bootstrap", Path(__file__).resolve().parents[1] / "bootstrap.py")
bootstrap = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bootstrap)


class BootstrapTests(unittest.TestCase):
    def test_checked_settings_are_non_secret_and_project_specific(self):
        c = bootstrap.settings(bootstrap.ROOT / "infra/gcp/settings.example.json")
        self.assertEqual(c["project"], "kavach-farmers-market-sense")
        self.assertTrue(c["githubRepositoryId"].isdigit())

    def test_production_trust_matches_github_immutable_subject(self):
        c = bootstrap.settings(bootstrap.ROOT / "infra/gcp/settings.example.json")
        self.assertEqual(bootstrap.github_condition(c),
            "assertion.repository_id=='1421988948' && assertion.repository_owner_id=='61903060'"
            " && assertion.ref=='refs/heads/main'"
            " && assertion.workflow_ref=='adwait-kalsekar/kavach/.github/workflows/backend.yml@refs/heads/main'"
            " && assertion.sub=='repo:adwait-kalsekar@61903060/kavach@1421988948:environment:production'"
            " && assertion.event_name in ['push','workflow_dispatch']")

    def test_invalid_project_and_named_database_are_rejected(self):
        c = json.loads((bootstrap.ROOT / "infra/gcp/settings.example.json").read_text())
        for change in [{"project": "--evil"}, {"database": "other"}]:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as f:
                json.dump({**c, **change}, f); f.flush()
                with self.assertRaises(ValueError): bootstrap.settings(f.name)

    @patch.object(bootstrap.subprocess, "run")
    def test_permission_errors_never_become_missing_resources(self, run):
        run.return_value = subprocess.CompletedProcess([], 1, "", "PERMISSION_DENIED: resource does not exist or access denied")
        with self.assertRaises(RuntimeError): bootstrap.call(["example"], optional=True)

    @patch.object(bootstrap.subprocess, "run")
    def test_only_explicit_not_found_is_optional(self, run):
        run.return_value = subprocess.CompletedProcess([], 1, "", "NOT_FOUND: missing")
        self.assertIsNone(bootstrap.call(["example"], optional=True))

    @patch.object(bootstrap.subprocess, "run")
    def test_cloud_run_missing_service_is_optional(self, run):
        run.return_value = subprocess.CompletedProcess([], 1, "", "ERROR: (gcloud.run.services.describe) Cannot find service [kavach-api]")
        self.assertIsNone(bootstrap.describe(["run", "services", "describe", "kavach-api"]))

    @patch.object(bootstrap.subprocess, "run")
    def test_cloud_run_permission_failure_is_not_missing(self, run):
        run.return_value = subprocess.CompletedProcess([], 1, "", "ERROR: (gcloud.run.services.describe) PERMISSION_DENIED: Cannot find service [kavach-api]")
        with self.assertRaises(RuntimeError):
            bootstrap.describe(["run", "services", "describe", "kavach-api"])

    @patch.object(bootstrap, "call")
    def test_preview_makes_no_cloud_calls(self, call):
        with patch("sys.argv", ["bootstrap.py"]): bootstrap.main()
        call.assert_not_called()
