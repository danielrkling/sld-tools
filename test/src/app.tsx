import { sld } from "solid-html";
import { Badge } from "@kobalte/core/badge";
import { Show } from "solid-js";

function Message(props: { message: string }) {
   return props.message
}

const jsx =  <><input class={"Asdd  "} /> Hello World!
   <Badge  ></Badge>
   <div> </div>
   <abbr ></abbr>
   <Show when={true} keyed={false} children={"123"} />
   <Message message=""  />
   <Badge  class="123" textValue="123">New</Badge>
   </>
   
const jsxShow = <Show when={true} keyed={false} children={"123"} />
const show = sld`<Show when=${true} keyed=${false} children=${"123"} />`

const x = sld`
   <input class=${"Asdd  "} asd /> Hello World!
   <Badge  ></Badge>
   <div children> </div>
   <abbr ></abbr>
   <Show when=${true} keyed=${false} children=${() => "123"} />
   <Message  />
   <Badge  class="123" textValue="123">New</Badge>
   
`;
