# from odoo import http


# class Schol(http.Controller):
#     @http.route('/schol/schol', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/schol/schol/objects', auth='public')
#     def list(self, **kw):
#         return http.request.render('schol.listing', {
#             'root': '/schol/schol',
#             'objects': http.request.env['schol.schol'].search([]),
#         })

#     @http.route('/schol/schol/objects/<model("schol.schol"):obj>', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('schol.object', {
#             'object': obj
#         })

