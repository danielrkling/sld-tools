const [isVisible, setIsVisible] = createSignal(true);

function jsx(strings: TemplateStringsArray, ...exprs: any[]) {}

function Component() {
  return jsx`
    <Show when=${isVisible()} fallback=${jsx`<p>Loading...</p>`}>
      <div>Hello World</div>
    </Show>
  `;
}

function AnotherComponent() {
  const [show, setShow] = createSignal(false);
  
  return jsx`
    <div>
      <Modal show=${show()}>
        <div>Modal Content</div>
      </Modal>
      <Button onClick=${() => setShow(!show())}>
        ${() => show() ? "Close" : "Open"}
      </Button>
    </div>
  `;
}

function NestedDeep() {
  return jsx`
    <Outer>
      <Inner>
        ${jsx`<span>Deep nested</span>`}
      </Inner>
    </Outer>
  `;
}
