import Eitri from 'eitri-bifrost'
import { Wake } from 'eitri-shopping-wake-shared'
import { queryUri } from '../queries/uri'

export const getUrlType = async url => {
	const _url = detachUrl(url)
	const result = await Wake.graphQl.query(queryUri, { url: _url })
	return result?.uri || null
}

export const detachUrl = url => {
	let cloneUrl = `${url}`
	cloneUrl = cloneUrl.trim().replace(/\?.*/, '')

	if (cloneUrl.toLowerCase().startsWith('http')) {
		let urlparts = cloneUrl.split('/')
		const newUrlParts = urlparts.slice(3)
		cloneUrl = newUrlParts.join('/')
	}

	if (cloneUrl.startsWith('/')) {
		cloneUrl = cloneUrl.substring(1)
	}

	return cloneUrl
}

/**
 * Abre o EitriApp de detalhe do produto
 * @param {(number|string)} productId - Id do produto.
 * @param {(number|string)} productVariationId - Id da variação do produto.
 */
export const openProduct = async productId => {
	try {
		eitriNavigationOpen({
			slug: 'pdp',
			initParams: { productId },
			replace: true
		})
	} catch (e) {
		console.error('navigate to PDP: Error', e)
		closeEitriApp()
	}
}

function resolveFacets(facet) {
	let query = null

	const facets = facet.filter(item => {
		if (item.key === 'ft') {
			query = item['value']
			return false
		}
		return true
	})

	const normalizedPath = { facets: facets }

	if (query) {
		normalizedPath.query = query
	}

	return normalizedPath
}

/**
 * Abre o EitriApp de home
 */
export const openHome = async deeplink => {
	try {
		let params = {}
		if (deeplink?.deeplinkFacets) {
			params = resolveFacets(deeplink?.deeplinkFacets)
		}

		if (deeplink?.sort) {
			params.sort = deeplink?.sort
		}

		if (deeplink) {
			eitriNavigationOpen({
				slug: 'home',
				initParams: { params, route: 'ProductCatalog' },
				replace: true
			})
		}
	} catch (e) {
		console.error('navigate to Home: Error', e)
		closeEitriApp()
	}
}

export const openCheckout = async () => {
	try {
		eitriNavigationOpen({
			slug: 'checkout',
			replace: true
		})
	} catch (e) {
		console.error('navigate to Checkout: Error', e)
		closeEitriApp()
	}
}

/**
 * Abre o EitriApp relacionado ao deeplink da push notification
 */

export const normalizePath = path => {
	let pathComponents = decodeURIComponent(path).split('?')
	let pathData = pathComponents[0].split('/').filter(Boolean)
	let queryParams = new URLSearchParams(pathComponents[1])
	let normalizedData = { facets: [] }

	if (queryParams.has('map')) {
		let mapKeys = queryParams.get('map').split(',')
		pathData.forEach((value, index) => {
			if (mapKeys[index] === 'ft') {
				normalizedData.query = value
			} else {
				normalizedData.facets.push({
					key: mapKeys[index],
					value: value
				})
			}
		})
	}

	if (path?.includes('filter')) {
		const paramsArray = path.split('&')

		paramsArray.forEach(param => {
			if (param.startsWith('filter.')) {
				const [keyWithFilter, value] = param.split('=')
				const key = keyWithFilter.replace('filter.', '')
				normalizedData.facets.push({
					key: key,
					value: decodeURIComponent(value)
				})
			}
		})
	}
	if (!path?.includes('filter') && !queryParams.has('map')) {
		pathData.forEach((value, index) => {
			normalizedData.facets.push({
				key: `category-${index + 1}`,
				value: value
			})
		})
	}

	if (path?.includes('sort')) {
		const sortMatch = path?.match(/sort=([^&]*)/)
		normalizedData.sort = sortMatch ? decodeURIComponent(sortMatch[1]) : ''
	}

	for (let [key, value] of queryParams.entries()) {
		if (key !== 'map') {
			normalizedData[key] = value
		}
	}

	return normalizedData
}

export const navigateHome = async (facets, title, type) => {
	let initParams

	if (facets.includes('?')) {
		const normalize = normalizePath(facets)
		initParams = { facets: normalize?.facets, sort: normalize?.sort, route: 'ProductCatalog', title }
	} else {
		initParams = { facets: [{ key: type, value: facets }], route: 'ProductCatalog', title }
	}

	try {
		eitriNavigationOpen({
			slug: 'home',
			initParams: initParams,
			replace: true
		})
	} catch (e) {
		console.error('navigate to Home: Error', e)
		closeEitriApp()
	}
}

export const navigateSearch = async value => {
	try {
		eitriNavigationOpen({
			slug: 'home',
			initParams: { searchTerm: value, route: 'Search' },
			replace: true
		})
	} catch (e) {
		console.error('navigate to Home: Error', e)
		closeEitriApp()
	}
}

export const navigateToCategory = async (category, title) => {
	const normalizedPath = normalizePath(category)
	try {
		eitriNavigationOpen({
			slug: 'home',
			initParams: { params: normalizedPath, route: 'ProductCatalog', title },
			replace: true
		})
	} catch (e) {
		console.error('navigate to Home: Error', e)
		closeEitriApp()
	}
}

export const openEitriApp = async (slug, params) => {
	try {
		eitriNavigationOpen({
			slug,
			initParams: params,
			replace: true
		})
	} catch (e) {
		console.error('navigate to Home: Error', e)
		closeEitriApp()
	}
}

export const openRedirectLinkBrowser = async (deeplink, inApp = false) => {
	try {
		const { applicationData } = await Eitri.getConfigs()

		let url
		if (applicationData.platform === "ios") {
			url = deeplink
		} else {
			const config = await Eitri.environment.getRemoteConfigs()
			const deepLinkDomain = getDomain(deeplink)
			const storeDomain = getDomain(config.providerInfo.host || config.providerInfo.domain)

			if (deepLinkDomain === storeDomain) {
				const encodedUrl = btoa(unescape(encodeURIComponent(deeplink)))
				url = `https://faststore-cms.s3.us-east-1.amazonaws.com/redirectIntent.html?link=${encodedUrl}`
			} else {
				url = deeplink
			}
		}

		Eitri.openBrowser({
			url: url,
			inApp
		})
		closeEitriApp()
	} catch (error) {
		console.error('Erro ao processar o deep link de busca', error)
		closeEitriApp()
	}
}

export const openBrowser = async (url, inApp = true) => {
	try {
		if (!url) closeEitriApp()

		await Eitri.openBrowser({
			url: url,
			inApp
		})
		
		if (!inApp) {
			closeEitriApp()
		}
	} catch (error) {
		console.error('Erro ao processar o deep link de busca', error)
		closeEitriApp()
	}
}

export const openCart = async (checkoutId = '') => {
	try {
		eitriNavigationOpen({
			slug: 'cart',
			initParams: { checkoutId },
			replace: true
		})
	} catch (e) {
		console.error('navigate to Cart: Error', e)
		closeEitriApp()
	}
}

export const openAccount = async () => {
	try {
		eitriNavigationOpen({
			slug: 'account',
			replace: true
		})
	} catch (e) {
		console.error('navigate to Cart: Error', e)
		closeEitriApp()
	}
}

export const openHotsiteUrl = async (hotsiteUrl) => {
	try {
		eitriNavigationOpen({
			slug: 'home',
			initParams: { route: 'hotsite', url: hotsiteUrl },
			replace: true
		})
	} catch (e) {
		console.error('navigate to Cart: Error', e)
		closeEitriApp()
	}
}

export const openSearchUrl = async (term, queryString = '') => {
	try {
		eitriNavigationOpen({
			slug: 'home',
			initParams: { route: 'search', value:term, queryString },
			replace: true
		})
	} catch (e) {
		console.error('navigate to Cart: Error', e)
		closeEitriApp()
	}
}

let appIsOpen = true
// centralizando Eitri.navigation.open, para melhorar debug de codigo
export const eitriNavigationOpen = params => {
	if (appIsOpen) {
		// console.log('eitriNavigationOpen', params)
		return Eitri.navigation.open(params)
	} 
}

// centralizando Eitri.close, correção para condição de corrida
export const closeEitriApp = async () => {
	if (appIsOpen) {
		appIsOpen = false
		await Eitri.close()
	} 
}

export const getDomain = (url) => {
	try {
		const { hostname } = new URL(url)
		return hostname?.toLowerCase()
	} catch (e) {
		return null
	}
}
