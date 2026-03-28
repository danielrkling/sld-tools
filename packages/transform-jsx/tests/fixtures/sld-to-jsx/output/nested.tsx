const [isVisible, setIsVisible] = createSignal(true);

function jsx(strings: TemplateStringsArray, ...exprs: any[]) {}

function Component() {
  return 
    <Show when={isVisible()} fallback={<p>Loading...</p>}>
      <div>Hello World</div>
    </Show>
  function AnotherComponent() {
  const [show, setShow] = createSignal(false);
  
  return 
    <div>
      <Modal show={show()}>
        <div>Modal Content</div>
      </Modal>
      <Button onClick={setShow(!show())}>
        {show() ? "Close" : "Open"}
      </Button>
    </div>
  ;
}

function NestedDeep() {
  return 
    <Outer>
      <Inner>
        <span>Deep nested</span>
      </Inner>
    </Outer>
  