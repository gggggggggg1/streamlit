/**
 * @license
 * Copyright 2018-2019 Streamlit Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { ReactNode, ReactElement } from "react"

import classNames from "classnames"
import ReactJson from "react-json-view"
import ReactMarkdown from "react-markdown"
import { Map as ImmutableMap } from "immutable"
// Ignoring typeScript for this module as it has no ts support
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import htmlParser from "react-markdown/plugins/html-parser"
// @ts-ignore
import { InlineMath, BlockMath } from "react-katex"
// @ts-ignore
import RemarkMathPlugin from "remark-math"

import { Text as TextProto } from "autogen/proto"
import CodeBlock from "../CodeBlock"
import "katex/dist/katex.min.css"
import "./Text.scss"

function getAlertCSSClass(format: TextProto.Format): string | undefined {
  switch (format) {
    case TextProto.Format.ERROR:
      return "alert-danger"
    case TextProto.Format.WARNING:
      return "alert-warning"
    case TextProto.Format.INFO:
      return "alert-info"
    case TextProto.Format.SUCCESS:
      return "alert-success"
  }
  return undefined
}

interface LinkProps {
  href: string
  children: ReactElement
}

interface LinkReferenceProps {
  href: string
  children: [ReactElement]
}

// Using target="_blank" without rel="noopener noreferrer" is a security risk:
// see https://mathiasbynens.github.io/rel-noopener
const linkWithTargetBlank = (props: LinkProps): ReactElement => (
  <a href={props.href} target="_blank" rel="noopener noreferrer">
    {props.children}
  </a>
)

// Handle rendering a link through a reference, ex [text](href)
// Don't convert to a link if only `[text]` and missing `(href)`
const linkReferenceHasParens = (props: LinkReferenceProps): any => {
  const { href, children } = props

  if (!href) {
    return children.length ? `[${children[0].props.children}]` : ""
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

export interface Props {
  width: number
  element: ImmutableMap<string, any>
}

/**
 * Functional element representing formatted text.
 */
class Text extends React.PureComponent<Props> {
  public render(): ReactNode {
    const { element, width } = this.props
    const body = element.get("body")
    const format = element.get("format")
    const renderers = {
      code: CodeBlock,
      link: linkWithTargetBlank,
      linkReference: linkReferenceHasParens,
      inlineMath: (props: { value: string }) => (
        <InlineMath>{props.value}</InlineMath>
      ),
      math: (props: { value: string }) => <BlockMath>{props.value}</BlockMath>,
    }
    const plugins = [RemarkMathPlugin]

    switch (format) {
      // Plain, fixed width text.
      case TextProto.Format.PLAIN: {
        const props = {
          className: classNames("fixed-width", "stText"),
          style: { width },
        }

        return <div {...props}>{body}</div>
      }

      // Markdown.
      case TextProto.Format.MARKDOWN: {
        const allowHTML = element.get("allowHtml")
        const astPlugins = allowHTML ? [htmlParser()] : []

        return (
          <div className="markdown-text-container stText" style={{ width }}>
            <ReactMarkdown
              source={body}
              escapeHtml={!allowHTML}
              astPlugins={astPlugins}
              plugins={plugins}
              renderers={renderers}
            />
          </div>
        )
      }

      // A JSON object. Stored as a string.
      case TextProto.Format.JSON: {
        let bodyObject = undefined
        try {
          bodyObject = JSON.parse(body)
        } catch (e) {
          const pos = parseInt(e.message.replace(/[^0-9]/g, ""), 10)
          e.message += `\n${body.substr(0, pos + 1)} ← here`
          throw e
        }
        return (
          <div className="json-text-container stText" style={{ width }}>
            <ReactJson
              src={bodyObject}
              displayDataTypes={false}
              displayObjectSize={false}
              name={false}
              style={{ font: "" }} // Unset so we can style via a CSS file.
            />
          </div>
        )
      }

      case TextProto.Format.ERROR:
      case TextProto.Format.WARNING:
      case TextProto.Format.INFO:
      case TextProto.Format.SUCCESS: {
        return (
          <div
            className={classNames("alert", getAlertCSSClass(format), "stText")}
            style={{ width }}
          >
            <div className="markdown-text-container">
              <ReactMarkdown
                source={body}
                renderers={renderers}
                plugins={plugins}
              />
            </div>
          </div>
        )
      }

      default:
        throw new Error(`Invalid Text format:${format}`)
    }
  }
}

export default Text
