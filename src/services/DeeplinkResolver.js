import Eitri from 'eitri-bifrost'
import { Wake } from 'eitri-shopping-wake-shared'
import { closeEitriApp, getUrlType, openEitriApp, openHome, openProduct, openRedirectLinkBrowser } from './NavigationService'
import { URI_TYPE } from './Constants'

const resolveDeeplinkRoot = async deeplink => {
	const domain = Wake?.configs?.domain
	if (!domain) return false

	const isRoot = new RegExp(`^https?:\/\/${domain}\/?(\\?.*)?$`).test(deeplink)
	if (isRoot) {
		await Eitri.exposedApis.appState.goHome()
		return true
	}
	return false
}

const resolveDeeplinkToProduct = async deeplink => {
	console.log('[resolveDeeplinkToProduct]', deeplink)
	try {
		const [baseUrl] = deeplink.split('?')

		if (!baseUrl.toLowerCase().includes('/produto/')) return false

		// Extrai o ID numérico no final do slug
		const productId = baseUrl.match(/-(\d+)\/?$/)?.[1] || null

		if (productId) {
			await openProduct(productId)
			return true
		}

		return false
	} catch (error) {
		console.error('Erro ao processar o deep link do produto', error)
		return false
	}
}

const resolveDeeplinkToRecoveryPass = async deeplink => {
	console.log('[resolveDeeplinkToRecoveryPass]', deeplink)
	if (!deeplink) return false

	const domain = Wake?.configs?.domain
	if (!domain) return false

	try {
		const [pathPart, queryParams] = deeplink.replace(new RegExp(`^https?:\/\/${domain}\/?`), '').split('?')
		if (!pathPart) return false

		const segments = pathPart.split('/').filter(Boolean)
		if (segments.length === 0) return false

		const finalUrl = `/${segments.join('/')}`

		// --- CASO ESPECIAL: RECOVERY ---
		if (finalUrl === '/login/password/recovery') {
			const urlObj = new URL(deeplink)
			const key = urlObj.searchParams.get('key')
			const redirectUrl = key ? `/recuperar-senha?key=${key}` : '/recuperar-senha'

			console.log('Interceptado RECOVERY:', redirectUrl)

			if (queryParams) {
				const params = new URLSearchParams(queryParams)
				if (!params.has('key')) return

				const keyRecovery = params.get('key')

				const initParams = { route: 'PasswordRecovery', keyRecovery }
				console.log('initParams_recovery', initParams)

				openEitriApp('account', initParams)
				return true
			}
		}

		return false
	} catch (error) {
		console.error('[resolveDeeplinkToRecoveryPass] Erro ao processar o deep link', error)
		return false
	}
}

const resolveDeeplinkToProductCatalog = async deeplink => {
	console.log('[resolveDeeplinkToProductCatalog]', deeplink)
	if (!deeplink) return false

	const domain = Wake?.configs?.domain
	if (!domain) return false

	// const [baseUrl, queryParams] = deeplink.split('?')

	try {
		// // CASO PRECISE DE ALGO PARECIDO DEPOIS
		// if (deeplink?.includes('&map=') || deeplink?.includes('?map=')) {
		// 	const paramsArray = queryParams.split('&')
		// 	const paramsObject = {}
		// 	let mapValues = []

		// 	paramsArray.forEach(param => {
		// 		const [key, value] = param.split('=')
		// 		if (key === 'map') {
		// 			mapValues = decodeURIComponent(value).split(',')
		// 		} else {
		// 			paramsObject[key] = value
		// 		}
		// 	})

		// 	if (mapValues.length > 0) {
		// 		const domain = Wake?.configs?.domain
		// 		if (!domain) return false
		// 		const pathSegments = baseUrl
		// 			.replace(new RegExp(`^https?:\/\/${domain}\/?`), '')
		// 			.split('#')[0]
		// 			.split('/')

		// 		const facets = mapValues.map((mapValue, index) => ({
		// 			key: mapValue,
		// 			value: pathSegments[index] || ''
		// 		}))
		// 		// openHome({ deeplinkFacets: facets })
		// 		return true
		// 	}
		// }

		// if (deeplink?.includes('filter')) {
		// 	const paramsArray = queryParams.split('&')
		// 	let facets = []

		// 	paramsArray.forEach(param => {
		// 		if (param.startsWith('filter.')) {
		// 			const [keyWithFilter, value] = param.split('=')
		// 			const key = keyWithFilter.replace('filter.', '')
		// 			facets.push({
		// 				key: key,
		// 				value: decodeURIComponent(value)
		// 			})
		// 		}
		// 	})

		// 	let sort = ''

		// 	if (deeplink?.includes('sort')) {
		// 		const sortMatch = deeplink?.match(/sort=([^&]*)/)
		// 		sort = sortMatch ? decodeURIComponent(sortMatch[1]) : ''
		// 	}

		// 	if (facets.length > 0) {
		// 		// openHome({ deeplinkFacets: facets, sort })
		// 		return true
		// 	}
		// }

		// Remove o domínio da URL e query params

		const path = deeplink.replace(new RegExp(`^https?:\/\/${domain}\/?`), '').split('?')[0]
		if (!path) return false

		const segments = path.split('/').filter(Boolean)
		if (segments.length === 0) return false

		const finalUrl = `/${segments.join('/')}`
		const pageType = await getUrlType(finalUrl)

		console.log('FINAL_URL', finalUrl)
		console.log('pageType', pageType)

		if (pageType?.kind === URI_TYPE.HOTSITE) {
			console.log('É HOTSITE')
			openEitriApp('home', { url: finalUrl, route: 'Hotsite' })
			return true
		}
		// else if (pageType?.kind === URI_TYPE.NOT_FOUND) {
		// 	console.log('É NOT_FOUND')
		// 	openEitriApp('home', { route: 'ErrorNotFound' })
		// 	return true
		// }

		return false
	} catch (error) {
		console.error('Erro ao processar o deep link de busca', error)
		return false
	}
}

const resolveDeeplinkToCheckout = deeplink => {
	console.log('resolveDeeplinkToCheckout', deeplink)
	if (!deeplink) return false

	const domain = Wake?.configs?.domain
	if (!domain) return false

	try {
		const [pathPart, queryParams] = deeplink.replace(new RegExp(`^https?:\/\/${domain}\/?`), '').split('?')
		if (!pathPart) return false

		const segments = pathPart.split('/').filter(Boolean)
		if (segments.length === 0) return false

		if (segments[0] !== 'checkout') return false

		let cartId = null

		if (segments[1]) {
			cartId = segments[1]
		}
		if (queryParams) {
			const params = new URLSearchParams(queryParams)
			if (params.has('checkoutId')) {
				cartId = params.get('checkoutId')
			}
		}

		const initParams = cartId ? { route: 'Home', cartId } : { route: 'Home' }
		console.log('initParams', initParams)

		openEitriApp('cart', initParams)
		return true
	} catch (error) {
		console.error('Erro ao processar deep link de checkout', error)
		return false
	}
}

const resolveStoreLinks = deeplink => {
	if (deeplink.includes('play.google') || deeplink.includes('app.apple')) {
		closeEitriApp()
		return true
	}
	return false
}

export const resolveDeeplinkFromRemoteConfig = deeplink => {
	const rcDeeplinkConfig = Wake?.configs?.deeplink
	if (!rcDeeplinkConfig?.deeplinkMap) {
		return false
	}

	const matchedDeeplink = rcDeeplinkConfig.deeplinkMap.find(dlinkMap => {
		return dlinkMap.path.some(path => deeplink.indexOf(path) > -1)
	})

	if (matchedDeeplink) {
		openEitriApp(matchedDeeplink.slug, matchedDeeplink.params)
		return true
	} else {
		return false
	}
}

export const resolveDeeplinkPath = async deeplink => {
	const deeplinkWays = [
		resolveStoreLinks,
		resolveDeeplinkRoot,
		resolveDeeplinkFromRemoteConfig,
		resolveDeeplinkToProduct,
		resolveDeeplinkToRecoveryPass,
		resolveDeeplinkToProductCatalog,
		resolveDeeplinkToCheckout,
		openRedirectLinkBrowser
	]

	try {
		for (const way of deeplinkWays) {
			try {
				let result = await way(deeplink)
				console.log('[DEEPLINK (resolveDeeplinkPath)] WAY', way.name)
				console.log('[DEEPLINK (resolveDeeplinkPath)] result', result)

				if (result) {
					return true
				}
			} catch (error) {
				console.error('Erro ao processar o deep link', error)
			}
		}
		closeEitriApp()
	} catch (error) {
		console.error('Erro ao processar o deep link', error)
		closeEitriApp()
	}
}
