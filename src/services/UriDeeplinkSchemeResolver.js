import Eitri from 'eitri-bifrost'
import { resolveDeeplinkFromRemoteConfig } from './DeeplinkResolver'
import { closeEitriApp, openAccount, openBrowser, openCart, openEitriApp, openHotsiteUrl, openProduct, openSearchUrl } from './NavigationService'
import { getProductById } from './ProductService'

const resolveDeeplinkToProduct = async deeplink => {
	try {
		let product = null

		if (deeplink?.includes('product/id')) {
			const productId = deeplink.split('product/id/')[1]
			product = await getProductById(productId)
		}

		// if (deeplink?.includes('product/slug')) {
		// 	const productSlug = deeplink.split('product/slug/')[1]
		// 	const _product = await getProductBySlug(productSlug)
		// 	product = _product?.[0]
		// }

		if (product) {
			openProduct(product)
			return true
		}

		return false
	} catch (error) {
		console.error('Erro ao processar o deep link do produto', error)
		return false
	}
}

const resolveCollection = async deeplink => {
	try {
		if (deeplink?.includes('collection')) {
			const params = deeplink.split('collection?')[1]
			const paramsObj = Object.fromEntries(new URLSearchParams(params))
			openEitriApp('home', {
				facets: [{ key: 'productClusterIds', value: paramsObj?.filter }],
				sort: paramsObj?.O,
				route: 'ProductCatalog'
			})
			return true
		}

		return false
	} catch (error) {
		console.error('Erro ao processar o deep link do produto', error)
		return false
	}
}

const resolveCategory = async deeplink => {
	if (!deeplink) return false

	if (!deeplink.includes('category')) {
		return
	}

	const params = deeplink.split('category/')[1]
	const categories = params.split('/')
	const facets = categories.map((category, index) => ({
		key: `category-${index + 1}`,
		value: category
	}))
	if (!facets) return false
	openEitriApp('home', { facets, route: 'ProductCatalog' })
	return true
}

const resolveWebView = async deeplink => {
	if (!deeplink) return false

	if (!deeplink.includes('webview')) {
		return false
	}

	const url = deeplink.split('webview/')[1]
	openBrowser(url)
	return true
}

const resolveSearch = async deeplink => {
	if (!deeplink) return false

	if (!deeplink.includes('search')) {
		return false
	}

	const term = deeplink.split('search/')[1]
	openEitriApp('home', {
		route: 'Search',
		searchTerm: term
	})
	return true
}

export const resolveUriDeeplinkScheme = async deeplink => {
	const [, fullPath] = deeplink.split('://')

	if (!fullPath) {
		closeEitriApp()
		return
	}

	let [path, queryString] = fullPath.split('?')
	if (!path) {
		closeEitriApp()
		return
	}
	
	path = path.toLowerCase()

	if (path.startsWith('product/id/')) {
		const productId = path.replace('product/id/', '')
		if (productId) {
			await openProduct(productId)
			return
		}
		closeEitriApp()
		return
	}

	if (path.startsWith('product/slug/')) {
		const match = path.match(/-(\d+)$/)
		const productId = match ? match[1] : null
		if (productId) {
			await openProduct(productId)
			return
		}
		closeEitriApp()
		return
	}

	if (path.startsWith('category/') || path.startsWith('collection/')) {
		const hotsiteUrl = fullPath.replace(/^(category\/|collection\/)/, '')
		
		await openHotsiteUrl(hotsiteUrl)
		return
	}

	if (path.startsWith('search/')) {
		const searchUrl = path.replace(/^(search\/)/, '')
		
		await openSearchUrl(searchUrl, queryString)
		return
	}

	if (path === 'home') {
		closeEitriApp()
		return
	}
	
	if (path.startsWith('cart/') || path === 'cart') {
		const checkoutId = path.replace('cart/', '')
		await openCart(checkoutId)
		return
	}
	
	if (path === 'account') {
		await openAccount()
		return
	}
	
	if (path.startsWith('webview/')) {
		const url = path.replace(/^(webview\/)/i, '')

		if (url?.startsWith('inapp/')) {
			const formatedUrl = decodeURIComponent(url.replace(/^inapp\//i, ''))
			openBrowser(formatedUrl, true)
			
		} else {
			openBrowser(decodeURIComponent(url), false)
		}
		return
	}

	closeEitriApp()
}
