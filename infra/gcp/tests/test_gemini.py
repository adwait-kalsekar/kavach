import importlib.util
import contextlib
import io
import subprocess
from pathlib import Path
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("gemini_probe", Path(__file__).resolve().parents[1] / "check-gemini.py")
probe = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(probe)


class GeminiProbeTests(unittest.TestCase):
    def test_invalid_identifiers_cannot_redirect_token_or_inject_a_path(self):
        for project, location, model in [("valid-project", "global.evil", "model"), ("valid-project", "global", "../model"), ("--evil", "global", "model"), ("valid-project", "global", "model\nother")]:
            with self.assertRaises(ValueError): probe.endpoint(project, location, model)

    def test_endpoints_stay_on_the_selected_google_api_host(self):
        self.assertEqual(probe.endpoint("valid-project", "global", "gemini-test"), "https://aiplatform.googleapis.com/v1/projects/valid-project/locations/global/publishers/google/models/gemini-test:generateContent")
        self.assertTrue(probe.endpoint("valid-project", "asia-south1", "gemini-test").startswith("https://asia-south1-aiplatform.googleapis.com/"))

    @patch.object(probe.subprocess, "run")
    @patch.object(probe.urllib.request, "urlopen")
    def test_plan_only_never_reads_credentials_or_makes_a_paid_call(self, urlopen, run):
        probe.main(["--model", "gemini-test"])
        run.assert_not_called()
        urlopen.assert_not_called()


    @patch.object(probe.subprocess, "run")
    @patch.object(probe.urllib.request, "urlopen")
    def test_model_success_keeps_the_access_token_out_of_output(self, urlopen, run):
        run.return_value = subprocess.CompletedProcess([], 0, "test-token-not-a-secret\n", "")
        response = io.StringIO('{"candidates":[{"content":{"parts":[{"text":"KAVACH_MODEL_OK"}]}}],"modelVersion":"fixture-version"}')
        urlopen.return_value.__enter__.return_value = response
        output = io.StringIO()
        with contextlib.redirect_stdout(output): probe.main(["--model", "gemini-test", "--run"])
        self.assertIn('"status": "ok"', output.getvalue())
        self.assertNotIn("test-token-not-a-secret", output.getvalue())
        request = urlopen.call_args.args[0]
        self.assertEqual(request.get_header("Authorization"), "Bearer test-token-not-a-secret")

    @patch.object(probe.subprocess, "run")
    @patch.object(probe.urllib.request, "urlopen")
    def test_provider_errors_never_echo_raw_response_or_credentials(self, urlopen, run):
        run.return_value = subprocess.CompletedProcess([], 0, "test-token-not-a-secret", "")
        urlopen.side_effect = probe.urllib.error.HTTPError("https://aiplatform.googleapis.com", 403, "private-error-detail", {}, io.BytesIO(b"private body"))
        with self.assertRaises(RuntimeError) as error: probe.probe("valid-project", "global", "gemini-test")
        self.assertIn("HTTP 403", str(error.exception))
        self.assertNotIn("private", str(error.exception))
        self.assertNotIn("test-token-not-a-secret", str(error.exception))
