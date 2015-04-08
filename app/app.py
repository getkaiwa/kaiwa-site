from flask import Flask, request, url_for, redirect, json, abort
import urllib
import requests
import mailchimp
import stripe


app = Flask(__name__)
app.config.from_pyfile('settings.cfg')
stripe.api_key = app.config.get('STRIPE_SECRET_KEY')
if app.config.get('MAILCHIMP_APIKEY'):
    mailchimp = mailchimp.Mailchimp(app.config['MAILCHIMP_APIKEY'])


@app.route('/')
def index():
    return 'Kaiwa App'


@app.route('/oauth/start')
def start():
    qs = urllib.urlencode({
        'client_id': app.config['DO_CLIENT_ID'],
        'redirect_uri': url_for('callback', _external=True, _scheme='https'),
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


@app.route('/charge', methods=['POST'])
def charge():
    success_resp = (json.dumps({"success": True}), 200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST"})

    if not app.config.get('STRIPE_SECRET_KEY'):
        return success_resp

    amount = int(float(request.form['amount']) * 100)
    if amount < 200:
        abort(400)

    if app.config.get('MAILCHIMP_LIST'):
        try:
            mailchimp.lists.subscribe(app.config['MAILCHIMP_LIST'],
                {'email': request.form['email']},
                double_optin=False, update_existing=True, send_welcome=False)
        except Exception as e:
            app.logger.error(e)

    try:
        charge = stripe.Charge.create(
            source=request.form['token'],
            amount=amount,
            currency='usd',
            description="Kaiwa contribution",
            metadata={"email": request.form['email']},
            receipt_email=request.form['email']
        )
    except stripe.error.StripeError as e:
        app.logger.error(e)
        abort(400)

    return success_resp


if __name__ == '__main__':
    app.run(debug=True)