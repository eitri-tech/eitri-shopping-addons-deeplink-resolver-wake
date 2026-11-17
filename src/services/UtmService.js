import Eitri from 'eitri-bifrost'
import { UTM_PARAMS_KEY } from './Constants'
import { sendCampaignDetails } from './CampaignTracking'

// ids de clique: chave normalizada da query/objeto -> chave guardada
const CLICK_ID_PARAMS = {
	gclid: 'gclid',
	fbclid: 'fbclid',
	ctopld: 'cto_pld'
}

const isSkippedValue = value => !value || `${value}`.startsWith('eitri')

/**
 * Normaliza um par chave/valor de UTM ou click id.
 * @param {string} key
 * @param {string} value
 * @param {Object} target
 */
const assignNormalizedParam = (key, value, target) => {
	const normalizedKey = `${key ?? ''}`.replace(/[_-]/g, '').toLowerCase()

	if (isSkippedValue(value)) return

	if (CLICK_ID_PARAMS[normalizedKey]) {
		target[CLICK_ID_PARAMS[normalizedKey]] = value

		return
	}

	// Awin: awc vira utm_campaign (mesmo contrato do resolver VTEX)
	if (normalizedKey === 'awc') {
		target.utm_campaign = value

		return
	}

	if (!normalizedKey.startsWith('utm')) return

	target[`utm_${normalizedKey.substring(3)}`] = value
}

/**
 * UTMs da query de um link (https ou scheme do app), com as chaves normalizadas para utm_<nome>, mais os ids
 * de clique (gclid, fbclid e cto_pld) e awc (Awin).
 * @param {string} [link]
 * @returns {Object}
 */
export const getUtmParamsFromLink = link => {
	const queryString = `${link ?? ''}`.split('?')[1]

	if (!queryString) return {}

	const utmParams = {}

	queryString
		.split('#')[0]
		.split('&')
		.forEach(param => {
			const [key, value] = param.split('=')
			assignNormalizedParam(key, value, utmParams)
		})

	return utmParams
}

/**
 * UTMs e click ids a partir de um objeto (ex.: startParams de push com action/value).
 * @param {Object} [params]
 * @returns {Object}
 */
export const getUtmParamsFromObject = params => {
	if (!params || typeof params !== 'object') return {}

	const utmParams = {}

	Object.entries(params).forEach(([key, value]) => {
		if (typeof value !== 'string' && typeof value !== 'number') return
		assignNormalizedParam(key, `${value}`, utmParams)
	})

	return utmParams
}

/**
 * Guarda as UTMs no sharedStorage (o mesmo para todos os Eitri-Apps), substituindo as anteriores, e envia
 * o campaign_details ao GA. Sem nenhuma UTM, o que estava guardado continua e nada é enviado.
 * @param {Object} [utmParams]
 */
export const saveUtmParams = async utmParams => {
	try {
		if (!utmParams || Object.keys(utmParams).length === 0) return

		// as UTMs que o link não traz ficam vazias, para não sobrar valor de um link anterior
		const params = {
			utm_source: '',
			utm_medium: '',
			utm_campaign: '',
			utm_content: '',
			utm_term: '',
			...utmParams,
			saveAt: new Date().toISOString()
		}

		await Eitri.sharedStorage.setItem(UTM_PARAMS_KEY, JSON.stringify(params))
	} catch (e) {
		console.error('saveUtmParams', e)
	}

	await sendCampaignDetails(utmParams)
}

/**
 * @param {string} [deeplink]
 */
export const saveUtmParamsFromDeeplink = deeplink => saveUtmParams(getUtmParamsFromLink(deeplink))

/**
 * @param {Object} [startParams]
 */
export const saveUtmParamsFromStartParams = startParams => saveUtmParams(getUtmParamsFromObject(startParams))
