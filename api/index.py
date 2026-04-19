import json
import traceback


def _import_error_app(exc):
	payload = {
		"success": False,
		"error": "Falha ao inicializar a aplicacao",
		"details": str(exc),
	}
	body = json.dumps(payload).encode("utf-8")

	def _wsgi_app(environ, start_response):
		start_response(
			"500 INTERNAL SERVER ERROR",
			[
				("Content-Type", "application/json; charset=utf-8"),
				("Content-Length", str(len(body))),
			],
		)
		return [body]

	return _wsgi_app


try:
	from app import app  # Flask WSGI app
except Exception as exc:
	traceback.print_exc()
	app = _import_error_app(exc)
