import json
import logging

from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)


class N8nDocScannerController(http.Controller):
    """Endpoint n8n can POST extracted results back to (async flow).

    Uses a plain HTTP route (not JSON-RPC) so a standard n8n "HTTP Request" node
    can call it with a raw JSON body:

        POST /n8n_doc_scanner/result
        Content-Type: application/json
        {
            "scan_id": 42,
            "token": "<same value as the configured auth token>",
            "data": { ...extracted fields... }
        }
    """

    def _json_response(self, payload, status=200):
        return request.make_response(
            json.dumps(payload),
            headers=[('Content-Type', 'application/json')],
            status=status,
        )

    def _check_token(self, body):
        configured = (request.env['ir.config_parameter'].sudo()
                      .get_param('n8n_doc_scanner.auth_token') or '').strip()
        # If no token is configured, the webhook is considered trusted/internal.
        if not configured:
            return True
        provided = (
            (body.get('token') if isinstance(body, dict) else None)
            or request.httprequest.headers.get('X-API-KEY')
            or request.httprequest.headers.get('Authorization')
            or ''
        ).strip()
        return provided == configured

    @http.route('/n8n_doc_scanner/result', type='http', auth='public',
                methods=['POST'], csrf=False, save_session=False)
    def receive_result(self, **kwargs):
        raw = request.httprequest.get_data(as_text=True) or ''
        try:
            body = json.loads(raw) if raw else dict(kwargs)
        except ValueError:
            return self._json_response({'status': 'error', 'message': 'Invalid JSON'}, status=400)

        if not isinstance(body, dict):
            return self._json_response({'status': 'error', 'message': 'Expected a JSON object'}, status=400)

        if not self._check_token(body):
            return self._json_response({'status': 'error', 'message': 'Unauthorized'}, status=401)

        scan_id = body.get('scan_id')
        data = body.get('data', body)
        if not scan_id:
            return self._json_response({'status': 'error', 'message': 'Missing scan_id'}, status=400)

        scan = request.env['scanner'].sudo().browse(int(scan_id))
        if not scan.exists():
            return self._json_response(
                {'status': 'error', 'message': 'Scan %s not found' % scan_id}, status=404)

        scan.n8n_response = raw[:65535]
        scan.process_n8n_result(data)
        return self._json_response({
            'status': 'ok' if scan.state == 'done' else 'error',
            'scan_state': scan.state,
            'result_model': scan.result_model,
            'result_res_id': scan.result_res_id,
            'message': scan.error_message or '',
        })
