const quizData = {
  coffee:{business:"Bean There Café",question:"Which ingredient gives a cappuccino its coffee flavour?",answers:["Tea leaves","Espresso coffee","Lemon juice","Cocoa butter"],correct:1,reward:"15% off your next coffee"},
  shopping:{business:"The Good Things Store",question:"Which of these is commonly used to wrap a gift?",answers:["Gift paper","Sand","Cooking oil","Soap"],correct:0,reward:"₹100 off purchases above ₹799"},
  beauty:{business:"Glow Studio",question:"Which of these is commonly used to moisturise skin?",answers:["Sand","Moisturiser","Chalk","Vinegar"],correct:1,reward:"20% off your first appointment"},
  cycle:{business:"Urban Cycle Care",question:"Which part of a bicycle helps it slow down or stop?",answers:["Bell","Brake","Seat","Basket"],correct:1,reward:"10% off your next service"}
};
const quizModal=document.getElementById("quizModal");
const infoModal=document.getElementById("infoModal");
const businessGrid=document.getElementById("businessGrid");
const searchInput=document.getElementById("searchInput");
const emptyState=document.getElementById("emptyState");
let activeCategory="All",activeView="all",activeQuiz=null,selectedAnswer=null;
function renderCards(){
  let visible=0;
  document.querySelectorAll(".business-card").forEach(card=>{
    const categoryMatch=activeCategory==="All"||card.dataset.category===activeCategory;
    const viewMatch=activeView==="all"||card.dataset.view==="nearby";
    const term=searchInput.value.trim().toLowerCase();
    const searchMatch=!term||card.dataset.search.includes(term);
    const show=categoryMatch&&viewMatch&&searchMatch;
    card.hidden=!show;if(show)visible++;
  });
  emptyState.hidden=visible!==0;
}
document.getElementById("filters").addEventListener("click",e=>{
  const button=e.target.closest(".filter");if(!button)return;
  document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b===button));
  activeCategory=button.dataset.category;renderCards();
});
document.querySelectorAll(".tab").forEach(button=>button.addEventListener("click",()=>{
  activeView=button.dataset.view;
  document.querySelectorAll(".tab").forEach(b=>{const active=b===button;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});
  renderCards();
}));
searchInput.addEventListener("input",renderCards);
businessGrid.addEventListener("click",e=>{
  const button=e.target.closest(".quiz-trigger");if(!button)return;
  activeQuiz=quizData[button.dataset.quiz];selectedAnswer=null;
  document.getElementById("modalBusiness").textContent=activeQuiz.business;
  document.getElementById("quizQuestion").textContent=activeQuiz.question;
  document.getElementById("answerOptions").innerHTML=activeQuiz.answers.map((answer,index)=>'<label class="answer-option"><input type="radio" name="quizAnswer" value="'+index+'"><span>'+answer+'</span></label>').join("");
  document.getElementById("quizFeedback").textContent="";
  document.getElementById("quizFeedback").className="quiz-feedback";
  document.getElementById("submitAnswer").disabled=false;
  quizModal.showModal();
});
document.getElementById("answerOptions").addEventListener("change",e=>{if(e.target.name==="quizAnswer")selectedAnswer=Number(e.target.value)});
document.getElementById("submitAnswer").addEventListener("click",()=>{
  const feedback=document.getElementById("quizFeedback");
  if(selectedAnswer===null){feedback.textContent="Choose an answer first.";feedback.className="quiz-feedback error";return}
  if(selectedAnswer===activeQuiz.correct){
    feedback.textContent="Correct! You unlocked: "+activeQuiz.reward+". Coupon delivery will be enabled after mobile registration is built.";
    feedback.className="quiz-feedback success";
    document.getElementById("submitAnswer").disabled=true;
  }else{
    feedback.textContent="Not quite. Please try again.";
    feedback.className="quiz-feedback error";
  }
});
document.getElementById("closeModal").addEventListener("click",()=>quizModal.close());
function showInfo(title,text){document.getElementById("infoTitle").textContent=title;document.getElementById("infoText").textContent=text;infoModal.showModal()}
document.getElementById("customerLogin").addEventListener("click",()=>showInfo("Customer sign-in","Mobile number registration, OTP verification and your personal coupon wallet will be added in the account stage."));
document.getElementById("businessLogin").addEventListener("click",()=>showInfo("Business registration","Business profiles, question creation, offer settings and coupon management will be added in the business dashboard stage."));
document.getElementById("businessCta").addEventListener("click",()=>showInfo("List your business","The business registration form and secure business dashboard are planned for the next development stage."));
document.getElementById("closeInfo").addEventListener("click",()=>infoModal.close());
document.getElementById("infoOk").addEventListener("click",()=>infoModal.close());
document.getElementById("locationButton").addEventListener("click",()=>{
  const message=document.getElementById("locationMessage");
  if(!("geolocation" in navigator)){message.textContent="Your browser does not support location sharing. You can still browse all offers.";return}
  message.textContent="Location access is not connected yet. Nearby listings currently use demo distances.";
});
document.getElementById("menuToggle").addEventListener("click",()=>document.querySelector(".main-nav").classList.toggle("open"));
document.querySelectorAll(".main-nav a").forEach(link=>link.addEventListener("click",()=>document.querySelector(".main-nav").classList.remove("open")));
renderCards();