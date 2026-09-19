# Qwik

A minimal, responsive website hosted on Azure Static Web Apps. Plain HTML and CSS; no dependencies or build step.

**Live website:** https://polite-river-00fb9ed10.4.azurestaticapps.net

## Local preview

```sh
python3 -m http.server 8000 --directory site
```

Open http://localhost:8000.

## Edit the website

Update `site/index.html`. Push to `main` to deploy through GitHub Actions.

## Azure deployment

The workflow in `.github/workflows/azure-static-web-apps.yml` publishes `site/` to Azure Static Web Apps. It requires the repository Actions secret `AZURE_STATIC_WEB_APPS_API_TOKEN`, containing the Azure app's deployment token. Never commit this token to source control.

Hosting uses the Azure Static Web Apps Free plan. This starter has no backend, database, or application sign-in.

Azure resource: `qwik` · Resource group: `qwik-rg` · Region: `centralus`.

To redeploy manually, open the repository's **Actions → Deploy to Azure → Run workflow**. Deployment results appear in the same Actions page.
