from flask import Flask, request, url_for, redirect
import urllib
import requests


app = Flask(__name__)
app.config.from_pyfile('oauth_settings.cfg')


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
    return redirect(app.config['CALLBACK_REDIRECT'] + '?token=' + data['access_token'])


if __name__ == '__main__':
    app.run(debug=True)