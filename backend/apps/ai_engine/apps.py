from django.apps import AppConfig


class AIEngineConfig(AppConfig):
    name = "apps.ai_engine"
    label = "ai_engine"
    verbose_name = "AI Engine"

    def ready(self):
        """
        Bootstrap the AI engine on Django startup.
        - Registers signal handlers
        - Pre-loads active model into memory cache (lazy)
        - Does NOT fail startup if model file is missing
        """
        try:
            import os
            if os.environ.get('SKIP_AI_WARMUP', 'False').lower() == 'true':
                import logging
                logger = logging.getLogger("medadhere.ai_engine")
                logger.info("AI Engine warmup skipped via SKIP_AI_WARMUP env var (model will load lazily on first prediction).")
                return

            from apps.ai_engine.services.inference import InferenceService
            InferenceService.warmup()
        except Exception as e:
            import logging
            logger = logging.getLogger("medadhere.ai_engine")
            logger.warning(
                f"AI Engine warmup skipped (will use fallback): {e}"
            )
