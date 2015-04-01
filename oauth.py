from flask import Flask, request, url_for, redirect
import urllib
import requests

app = Flask(__name__)

app.config.update({
  "DO_CLIENT_ID": "ebf26b3760146923c419372d966ef01b3168f2b0500df9196e55fc010d3966e4",
  "DO_CLIENT_SECRET": "7462c63aac37fd0f5c1bc0aa1b3cf7c7a409d213d357e095507e293ed71c3b43",
  "FRONT_SERVER": "http://localhost:4000"
})


@app.route('/oauth/start')
def start():
    qs = urllib.urlencode({
        'client_id': app.config['DO_CLIENT_ID'],
        'redirect_uri': url_for('callback', _external=True),
        'response_type': 'code',
        'scope': 'read write'
    })
    return redirect('https://cloud.digitalocean.com/v1/oauth/authorize?' + qs)


@app.route('/oauth/callback')
def callback():
    code = request.values['code']
    r = requests.post('https://cloud.digitalocean.com/v1/oauth/token', data={
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': app.config['DO_CLIENT_ID'],
        'client_secret': app.config['DO_CLIENT_SECRET'],
        'redirect_uri': url_for('callback', _external=True)
    })
    data = r.json()
    return redirect(app.config['FRONT_SERVER'] + '/deploy/do.html?token=' + data['access_token'])


if __name__ == '__main__':
    app.run(debug=True)