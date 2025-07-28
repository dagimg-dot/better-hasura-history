const createBetterHistoryButton = () => {
  const btn = document.createElement('button')
  btn.textContent = 'Better History'

  // style it like the original button
  btn.style.backgroundColor = '#fdfdfd'
  btn.style.background = 'linear-gradient(#f9f9f9, #ececec)'
  btn.style.border = '0'
  btn.style.borderRadius = '3px'
  btn.style.boxShadow =
    'inset 0 0 0 1px rgba(0, 0, 0, 0.20), 0 1px 0 rgba(255, 255, 255, 0.7), inset 0 1px #fff'
  btn.style.color = '#555'
  btn.style.cursor = 'pointer'
  btn.style.display = 'inline-block'
  btn.style.margin = '0 5px'
  btn.style.padding = '3px 11px 5px'
  btn.style.textDecoration = 'none'
  btn.style.textOverflow = 'ellipsis'
  btn.style.whiteSpace = 'nowrap'
  btn.style.maxWidth = '150px'

  btn.setAttribute('title', 'View API call history')
  // Change visible text
  btn.textContent = 'Better History'

  // Change tooltip (title attribute)
  btn.setAttribute('title', 'View API call history')

  return btn
}

(async function () {
  console.log('contentScript is running')
  await new Promise((resolve) => setTimeout(resolve, 3000))
  const topBar = document.querySelector('.topBar')
  if (!topBar) {
    console.log('topBar not found')
    return
  }

  const btn = createBetterHistoryButton()

  // append it in the 2nd position
  topBar.insertBefore(btn, topBar.children[2])
})()
