import React from 'react'
import Header from '../components/Header'
import { createGlobalStyle } from 'styled-components'
const GlobalStyle = createGlobalStyle`
 body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
    "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`
const simple = (props) => {
    const {children} =props
    return (
        <>
        <GlobalStyle  />
            <Header/>
            {children}
        </>
    )
}

export default simple
