export const queryUri = `query ($url: String!) {
  uri(url: $url){
    kind
    redirectCode
    redirectUrl
  }
}`
