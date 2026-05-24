from __future__ import annotations

import os
import tempfile
from pathlib import Path
from unittest import TestCase

from app.core.config import get_settings
from app.core.errors import BackendApiError
from app.domains.video_analysis.service import (
    _raise_youtube_extraction_error,
    _set_ytdlp_cookiefile_option,
)


class YoutubeCookieRuntimeFileTests(TestCase):
    def tearDown(self) -> None:
        os.environ.pop("YOUTUBE_COOKIES_FILE", None)
        os.environ.pop("YOUTUBE_COOKIES_PATH", None)
        os.environ.pop("YOUTUBE_COOKIES_RUNTIME_FILE", None)
        os.environ.pop("YOUTUBE_COOKIES_RUNTIME_PATH", None)
        get_settings.cache_clear()

    def test_cookie_source_is_copied_to_writable_runtime_file(self) -> None:
        with tempfile.TemporaryDirectory() as source_dir, tempfile.TemporaryDirectory() as runtime_dir:
            source = Path(source_dir) / "youtube-cookies.txt"
            source.write_text("# Netscape HTTP Cookie File\n", encoding="utf-8")
            os.environ["YOUTUBE_COOKIES_FILE"] = str(source)
            get_settings.cache_clear()

            options: dict[str, object] = {}
            _set_ytdlp_cookiefile_option(options, runtime_dir)

            runtime_cookie = Path(str(options["cookiefile"]))
            self.assertNotEqual(runtime_cookie, source)
            self.assertTrue(runtime_cookie.is_file())
            self.assertEqual(runtime_cookie.read_text(encoding="utf-8"), source.read_text(encoding="utf-8"))

    def test_missing_cookie_source_is_not_passed_to_ytdlp(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            os.environ["YOUTUBE_COOKIES_FILE"] = str(Path(temp_dir) / "missing-youtube-cookies.txt")
            get_settings.cache_clear()

            options: dict[str, object] = {}
            _set_ytdlp_cookiefile_option(options, temp_dir)

            self.assertNotIn("cookiefile", options)

    def test_configured_runtime_path_uses_unique_copy(self) -> None:
        with (
            tempfile.TemporaryDirectory() as source_dir,
            tempfile.TemporaryDirectory() as temp_dir,
            tempfile.TemporaryDirectory() as runtime_dir,
        ):
            source = Path(source_dir) / "youtube-cookies.txt"
            source.write_text("# cookies\n", encoding="utf-8")
            os.environ["YOUTUBE_COOKIES_FILE"] = str(source)
            os.environ["YOUTUBE_COOKIES_RUNTIME_PATH"] = str(Path(runtime_dir) / "youtube-cookies.txt")
            get_settings.cache_clear()

            first: dict[str, object] = {}
            second: dict[str, object] = {}
            _set_ytdlp_cookiefile_option(first, temp_dir)
            _set_ytdlp_cookiefile_option(second, temp_dir)

            self.assertNotEqual(first["cookiefile"], second["cookiefile"])
            self.assertTrue(Path(str(first["cookiefile"])).is_file())
            self.assertTrue(Path(str(second["cookiefile"])).is_file())

    def test_read_only_cookie_path_error_is_classified_without_secret_path(self) -> None:
        with self.assertRaises(BackendApiError) as context:
            _raise_youtube_extraction_error(
                OSError(30, "Read-only file system", "/etc/secrets/youtube-cookies.txt")
            )

        self.assertEqual(context.exception.code, "YOUTUBE_COOKIE_FILE_UNAVAILABLE")
        self.assertNotIn("/etc/secrets", str(context.exception))
